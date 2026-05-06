from django.db import models
from accounts.models import User

class TimeTracking(models.Model):
    """
    Model for tracking Technician Time, Travel, and Billing Proficiency.
    """
    date = models.DateField()

    # FIELDEDGE DATA (Array of timesheet entries)
    fieldedge_data = models.JSONField(default=list, null=True, blank=True, help_text="List of activities from FieldEdge")
    
    # WORK ORDER INFO
    wo_number = models.CharField(max_length=100, null=True, blank=True)
    full_address = models.TextField(null=True, blank=True)
    technician_name = models.CharField(max_length=255, null=True, blank=True)
    
    # FLEETMATICS DATA (Array of matching activities)
    fleetmatics_data = models.JSONField(default=list, null=True, blank=True, help_text="List of matching activities from Fleetmatics")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_time_records')

    class Meta:
        db_table = 'time_tracking'
        ordering = ['-date', 'technician_name']
        unique_together = ('wo_number', 'date')

    def __str__(self):
        return f"WO {self.wo_number} - {self.technician_name or 'Unknown'} - {self.date}"

class TimeTrackingSeen(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='seen_time_tracking')
    record = models.ForeignKey(TimeTracking, on_delete=models.CASCADE, related_name='user_seen_records')
    seen_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'time_tracking_user_seen'
        unique_together = ('user', 'record')

    def __str__(self):
        return f"{self.user} saw {self.record}"
