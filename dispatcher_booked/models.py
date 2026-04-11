from django.db import models


class DispatcherBooked(models.Model):
    date = models.DateField()

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

    def __str__(self):
        return f"DispatcherBooked {self.id} - {self.date}"