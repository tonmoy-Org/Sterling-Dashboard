from rest_framework import serializers
from .models import ScraperExecutionLog, ServiceStatus, Incident

class ScraperExecutionLogSerializer(serializers.ModelSerializer):
    """
    Serializer for scraper execution logs.
    """
    class Meta:
        model = ScraperExecutionLog
        fields = '__all__'

class ServiceStatusSerializer(serializers.ModelSerializer):
    uptime_percentage = serializers.ReadOnlyField()

    class Meta:
        model = ServiceStatus
        fields = ['id', 'service_name', 'is_operational', 'last_checked_at', 'outage_started_at', 'uptime_percentage']

class IncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = '__all__'
