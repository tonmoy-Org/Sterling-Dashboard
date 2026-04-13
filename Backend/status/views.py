from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import ScraperExecutionLog, ServiceStatus, Incident
from .serializers import ScraperExecutionLogSerializer, ServiceStatusSerializer, IncidentSerializer

@api_view(['GET'])
@permission_classes([AllowAny])
def service_status_list(request):
    """
    GET /api/health-check/services/
    Returns the uptime and current status of all services.
    """
    services = ServiceStatus.objects.all()
    serializer = ServiceStatusSerializer(services, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([AllowAny])
def scraper_log_list(request):
    """
    GET /api/health-check/logs/
    Returns the history of scraper execution logs.

    Query Parameters:
      - scraper_name (str): Filter by scraper name (case-insensitive contains)
      - status       (str): Filter by status ('success', 'error', 'partial')
      - limit        (int): Limit the number of results returned (default: 50)
    """
    qs = ScraperExecutionLog.objects.all()

    scraper_name = request.query_params.get('scraper_name')
    if scraper_name:
        qs = qs.filter(scraper_name__icontains=scraper_name)

    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)

    try:
        limit = int(request.query_params.get('limit', 50))
    except ValueError:
        limit = 50

    qs = qs[:limit]

    serializer = ScraperExecutionLogSerializer(qs, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([AllowAny])
def scraper_log_detail(request, pk):
    """
    GET /api/health-check/logs/<id>/
    Returns a single scraper execution log.
    """
    try:
        log = ScraperExecutionLog.objects.get(pk=pk)
    except ScraperExecutionLog.DoesNotExist:
        return Response(
            {'error': 'Log not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    return Response(ScraperExecutionLogSerializer(log).data)

@api_view(['GET'])
@permission_classes([AllowAny])
def incident_list(request):
    """
    GET /api/health-check/incidents/
    Returns the list of incidents.
    """
    qs = Incident.objects.all()

    service_name = request.query_params.get('service_name')
    if service_name:
        qs = qs.filter(service_name__icontains=service_name)

    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)

    serializer = IncidentSerializer(qs, many=True)
    return Response(serializer.data)
