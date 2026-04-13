from django.contrib import admin
from .models import ScraperExecutionLog, Incident

@admin.register(ScraperExecutionLog)
class ScraperExecutionLogAdmin(admin.ModelAdmin):
    list_display = ['scraper_name', 'status', 'records_processed', 'execution_time_seconds', 'executed_at']
    list_filter = ['status', 'scraper_name', 'executed_at']
    search_fields = ['scraper_name', 'error_message']
    readonly_fields = ['executed_at']
    ordering = ['-executed_at']


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ['service_name', 'title', 'status', 'created_at', 'resolved_at']
    list_filter = ['status', 'service_name']
    search_fields = ['service_name', 'title', 'description']
    readonly_fields = ['created_at']
    ordering = ['-created_at']

