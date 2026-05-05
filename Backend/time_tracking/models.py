from django.db import models
from accounts.models import User

class TimeTracking(models.Model):
    """
    Model for tracking Technician Time, Travel, and Billing Proficiency.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='time_tracking_records', null=True, blank=True)
    date = models.DateField()
    
    # WORKING TIME SECTION
    
    actual_worked_start = models.TimeField(null=True, blank=True)
    actual_worked_end = models.TimeField(null=True, blank=True)
    actual_worked_duration = models.IntegerField(default=0, help_text="Duration in minutes (Standard)")
    
    time_tracking_proficiency = models.FloatField(default=0.0, help_text="Time Tracking Proficiency (%)")
    
    # BILLING SECTION
    time_billed_duration = models.IntegerField(default=0, help_text="Time Billed in minutes (Variant)")
    # Note: actual_worked_duration (Standard) is shared with WORKING TIME section in the UI
    
    billing_proficiency = models.FloatField(default=0.0, help_text="Billing Proficiency (%)")
    
    # WORK ORDER INFO
    wo_number = models.CharField(max_length=100, null=True, blank=True)
    full_address = models.TextField(null=True, blank=True)
    technician_name = models.CharField(max_length=255, null=True, blank=True)
    
    # FLEETMATICS DATA
    fleetmatics_arrival_time = models.TimeField(null=True, blank=True)
    fleetmatics_departure_time = models.TimeField(null=True, blank=True)
    fleetmatics_stop_duration = models.IntegerField(default=0, help_text="Stop Duration in minutes")
    fleetmatics_idle_duration = models.IntegerField(default=0, help_text="Idle Duration in minutes")
    
    # COORDINATES (For Area Matching)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'time_tracking'
        ordering = ['-date', 'technician_name']

    def __str__(self):
        name = self.user.name if self.user else self.technician_name or "Unknown Tech"
        return f"WO {self.wo_number} - {name} - {self.date}"
