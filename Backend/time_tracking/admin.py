from django.contrib import admin
from .models import TimeTracking

@admin.register(TimeTracking)
class TimeTrackingAdmin(admin.ModelAdmin):
    list_display = ('technician_name', 'date', 'wo_number', 'is_deleted')
    list_filter = ('date', 'is_deleted')
    search_fields = ('technician_name', 'wo_number', 'full_address')
