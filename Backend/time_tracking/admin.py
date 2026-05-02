from django.contrib import admin
from .models import TimeTracking

@admin.register(TimeTracking)
class TimeTrackingAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'travel_coding_proficiency', 'time_tracking_proficiency', 'billing_proficiency')
    list_filter = ('date', 'user')
    search_fields = ('user__name', 'user__email')
