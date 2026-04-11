from django.contrib import admin
from .models import Service, HealthCheck, Incident, ScraperExecutionLog


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'current_status', 'is_active', 'last_checked_at', 'display_order']
    list_filter = ['category', 'current_status', 'is_active']
    search_fields = ['name', 'slug', 'description']
    list_editable = ['is_active', 'display_order', 'current_status']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['display_order', 'name']


@admin.register(HealthCheck)
class HealthCheckAdmin(admin.ModelAdmin):
    list_display = ['service', 'status', 'response_time_ms', 'checked_at']
    list_filter = ['status', 'service', 'checked_at']
    search_fields = ['service__name', 'error_message']
    readonly_fields = ['checked_at']
    ordering = ['-checked_at']


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = [
        'service', 'title', 'severity', 'is_resolved',
        'is_acknowledged', 'started_at', 'resolved_at', 'duration_display',
    ]
    list_filter = ['severity', 'is_resolved', 'is_acknowledged', 'service']
    search_fields = ['title', 'description', 'service__name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-started_at']

    def duration_display(self, obj):
        return obj.duration_display
    duration_display.short_description = 'Duration'


@admin.register(ScraperExecutionLog)
class ScraperExecutionLogAdmin(admin.ModelAdmin):
    list_display = ['scraper_name', 'status', 'records_processed', 'execution_time_seconds', 'executed_at']
    list_filter = ['status', 'scraper_name', 'executed_at']
    search_fields = ['scraper_name', 'error_message']
    readonly_fields = ['executed_at']
    ordering = ['-executed_at']

