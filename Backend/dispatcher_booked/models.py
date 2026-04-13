from django.db import models
from accounts.models import User
from django.utils import timezone


class DispatcherBooked(models.Model):
    date = models.DateTimeField(default=timezone.now)
    cameron_booked = models.PositiveIntegerField(null=True, blank=True)
    cameron_total = models.PositiveIntegerField(null=True, blank=True)
    eric_booked = models.PositiveIntegerField(null=True, blank=True)
    eric_total = models.PositiveIntegerField(null=True, blank=True)
    total_jobs_booked = models.PositiveIntegerField(null=True, blank=True)
    all_leads = models.PositiveIntegerField(null=True, blank=True)
    deleted_by = models.CharField(max_length=255, null=True, blank=True)
    deleted_by_email = models.EmailField(null=True, blank=True)
    deleted_date = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'dispatcher_booked'
        ordering = ['-id']

    def __str__(self):
        return f"DispatcherBooked {self.id} - {self.date}"
    


class DispatcherBookedSeen(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='seen_dispatcher_booked')
    dispatcher_booked = models.ForeignKey(DispatcherBooked, on_delete=models.CASCADE, related_name='user_seen_records')
    seen_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'dispatcher_booked_user_seen'
        unique_together = ('user', 'dispatcher_booked')

    def __str__(self):
        return f"{self.user} saw {self.dispatcher_booked}"