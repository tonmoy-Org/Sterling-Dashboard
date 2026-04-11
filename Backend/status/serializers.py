from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta

from .models import Service, HealthCheck, Incident


class HealthCheckSerializer(serializers.ModelSerializer):
    """Serializer for individual health check records."""

    class Meta:
        model = HealthCheck
        fields = [
            'id', 'service', 'status', 'response_time_ms',
            'error_message', 'details', 'checked_at',
        ]


class IncidentSerializer(serializers.ModelSerializer):
    """Serializer for incident records."""
    service_name = serializers.CharField(source='service.name', read_only=True)
    duration_display = serializers.CharField(read_only=True)

    class Meta:
        model = Incident
        fields = [
            'id', 'service', 'service_name', 'title', 'description',
            'severity', 'started_at', 'acknowledged_at', 'resolved_at',
            'duration_seconds', 'duration_display',
            'is_resolved', 'is_acknowledged',
            'created_at', 'updated_at',
        ]


class ServiceStatusSerializer(serializers.ModelSerializer):
    """
    Service with its current status, last check info, and uptime metrics.
    Used for the main status page listing.
    """
    uptime_today = serializers.SerializerMethodField()
    uptime_week = serializers.SerializerMethodField()
    uptime_month = serializers.SerializerMethodField()
    last_check = serializers.SerializerMethodField()
    active_incidents = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            'id', 'name', 'slug', 'description', 'category',
            'current_status', 'is_active', 'display_order',
            'last_checked_at', 'uptime_today', 'uptime_week',
            'uptime_month', 'last_check', 'active_incidents',
        ]

    def _calculate_uptime(self, obj, since):
        """Calculate uptime percentage for a given time period."""
        checks = HealthCheck.objects.filter(
            service=obj,
            checked_at__gte=since,
        )
        total = checks.count()
        if total == 0:
            return 100.0  # No checks = assume operational

        healthy = checks.filter(status='healthy').count()
        return round((healthy / total) * 100, 2)

    def get_uptime_today(self, obj):
        since = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        return self._calculate_uptime(obj, since)

    def get_uptime_week(self, obj):
        since = timezone.now() - timedelta(days=7)
        return self._calculate_uptime(obj, since)

    def get_uptime_month(self, obj):
        since = timezone.now() - timedelta(days=30)
        return self._calculate_uptime(obj, since)

    def get_last_check(self, obj):
        last = obj.health_checks.first()
        if last:
            return HealthCheckSerializer(last).data
        return None

    def get_active_incidents(self, obj):
        incidents = obj.incidents.filter(is_resolved=False)
        return IncidentSerializer(incidents, many=True).data


class UptimeMetricsSerializer(serializers.Serializer):
    """Aggregated uptime metrics for all services."""
    service_id = serializers.IntegerField()
    service_name = serializers.CharField()
    service_slug = serializers.CharField()
    category = serializers.CharField()
    current_status = serializers.CharField()
    uptime_today = serializers.FloatField()
    uptime_week = serializers.FloatField()
    uptime_month = serializers.FloatField()
    total_checks_today = serializers.IntegerField()
    total_checks_week = serializers.IntegerField()
    total_checks_month = serializers.IntegerField()


class OverallStatusSerializer(serializers.Serializer):
    """Overall system status summary."""
    overall_status = serializers.CharField()
    total_services = serializers.IntegerField()
    operational_count = serializers.IntegerField()
    degraded_count = serializers.IntegerField()
    outage_count = serializers.IntegerField()
    overall_uptime_today = serializers.FloatField()
    overall_uptime_week = serializers.FloatField()
    overall_uptime_month = serializers.FloatField()
    last_updated = serializers.DateTimeField()
    services = ServiceStatusSerializer(many=True)
