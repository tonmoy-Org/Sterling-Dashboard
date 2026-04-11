"""
Views for the public /health-check endpoint.
All status endpoints are publicly accessible (no authentication required).
"""

from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Service, HealthCheck, Incident
from .serializers import (
    ServiceStatusSerializer,
    HealthCheckSerializer,
    IncidentSerializer,
    OverallStatusSerializer,
)


# ─────────────────────────────────────────────────────────────
# Public Endpoints (no auth)
# ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def overall_status(request):
    """
    GET /health-check/
    Returns overall system status with all services, uptime metrics,
    and active incidents — similar to Upwork's status page.
    """
    services = Service.objects.filter(is_active=True)

    # Count statuses
    total = services.count()
    operational = services.filter(current_status='operational').count()
    degraded = services.filter(current_status='degraded').count()
    outage = services.filter(
        current_status__in=['partial_outage', 'major_outage']
    ).count()

    # Determine overall status
    if outage > 0:
        overall = 'major_outage'
    elif degraded > 0:
        overall = 'degraded'
    else:
        overall = 'operational'

    # Calculate overall uptime
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    def _overall_uptime(since):
        checks = HealthCheck.objects.filter(checked_at__gte=since)
        total_checks = checks.count()
        if total_checks == 0:
            return 100.0
        healthy = checks.filter(status='healthy').count()
        return round((healthy / total_checks) * 100, 2)

    # Serialize services with their individual uptime
    services_data = ServiceStatusSerializer(services, many=True).data

    response_data = {
        'overall_status': overall,
        'total_services': total,
        'operational_count': operational,
        'degraded_count': degraded,
        'outage_count': outage,
        'overall_uptime_today': _overall_uptime(today_start),
        'overall_uptime_week': _overall_uptime(week_ago),
        'overall_uptime_month': _overall_uptime(month_ago),
        'last_updated': now,
        'services': services_data,
    }

    return Response(response_data)


@api_view(['GET'])
@permission_classes([AllowAny])
def service_list(request):
    """
    GET /health-check/services/
    List all monitored services with their current status.
    """
    services = Service.objects.filter(is_active=True)
    serializer = ServiceStatusSerializer(services, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def service_detail(request, pk):
    """
    GET /health-check/services/<id>/
    Single service detail with full health check history.
    """
    try:
        service = Service.objects.get(pk=pk, is_active=True)
    except Service.DoesNotExist:
        return Response(
            {'error': 'Service not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    service_data = ServiceStatusSerializer(service).data

    # Include recent health check history (last 50)
    recent_checks = service.health_checks.all()[:50]
    service_data['recent_checks'] = HealthCheckSerializer(recent_checks, many=True).data

    # Include incident history (last 20)
    recent_incidents = service.incidents.all()[:20]
    service_data['incident_history'] = IncidentSerializer(recent_incidents, many=True).data

    return Response(service_data)


@api_view(['GET'])
@permission_classes([AllowAny])
def uptime_metrics(request):
    """
    GET /health-check/uptime/
    Returns uptime metrics for all services (today, week, month).
    """
    services = Service.objects.filter(is_active=True)
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    metrics = []
    for service in services:
        def _uptime(since):
            checks = HealthCheck.objects.filter(service=service, checked_at__gte=since)
            total = checks.count()
            if total == 0:
                return 100.0, 0
            healthy = checks.filter(status='healthy').count()
            return round((healthy / total) * 100, 2), total

        uptime_today, checks_today = _uptime(today_start)
        uptime_week, checks_week = _uptime(week_ago)
        uptime_month, checks_month = _uptime(month_ago)

        metrics.append({
            'service_id': service.id,
            'service_name': service.name,
            'service_slug': service.slug,
            'category': service.category,
            'current_status': service.current_status,
            'uptime_today': uptime_today,
            'uptime_week': uptime_week,
            'uptime_month': uptime_month,
            'total_checks_today': checks_today,
            'total_checks_week': checks_week,
            'total_checks_month': checks_month,
        })

    return Response(metrics)


@api_view(['GET'])
@permission_classes([AllowAny])
def incident_list(request):
    """
    GET /health-check/incidents/
    Returns active and recent incidents.
    """
    # Active incidents first
    active = Incident.objects.filter(is_resolved=False)
    active_data = IncidentSerializer(active, many=True).data

    # Recent resolved incidents (last 30 days)
    month_ago = timezone.now() - timedelta(days=30)
    resolved = Incident.objects.filter(
        is_resolved=True,
        resolved_at__gte=month_ago
    )[:50]
    resolved_data = IncidentSerializer(resolved, many=True).data

    return Response({
        'active_incidents': active_data,
        'recent_resolved': resolved_data,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def incident_history(request):
    """
    GET /health-check/incidents/history/
    Returns paginated incident history.
    """
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 20))
    offset = (page - 1) * page_size

    total = Incident.objects.count()
    incidents = Incident.objects.all()[offset:offset + page_size]
    data = IncidentSerializer(incidents, many=True).data

    return Response({
        'total': total,
        'page': page,
        'page_size': page_size,
        'total_pages': (total + page_size - 1) // page_size,
        'results': data,
    })


# ─────────────────────────────────────────────────────────────
# Admin Endpoints (auth required)
# ─────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_now(request):
    """
    POST /health-check/check-now/
    Trigger an immediate health check for all services.
    Requires authentication.
    """
    from status.health_checker import run_health_checks

    try:
        run_health_checks()
        return Response({'message': 'Health checks completed successfully.'})
    except Exception as e:
        return Response(
            {'error': f'Health check failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def acknowledge_incident(request, pk):
    """
    POST /health-check/incidents/<id>/acknowledge/
    Acknowledge an active incident. Requires authentication.
    """
    try:
        incident = Incident.objects.get(pk=pk)
    except Incident.DoesNotExist:
        return Response(
            {'error': 'Incident not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if incident.is_acknowledged:
        return Response({'message': 'Incident already acknowledged.'})

    incident.is_acknowledged = True
    incident.acknowledged_at = timezone.now()
    incident.save()

    return Response({
        'message': f'Incident #{incident.id} acknowledged.',
        'data': IncidentSerializer(incident).data,
    })
