from django.db import models
from django.utils import timezone


class ServiceStatus(models.Model):
    """
    Simpler tracking of service uptime and downtime.
    """
    service_name = models.CharField(max_length=255, unique=True)
    is_operational = models.BooleanField(default=True)
    last_checked_at = models.DateTimeField(auto_now=True)
    
    outage_started_at = models.DateTimeField(null=True, blank=True)
    tracked_since = models.DateTimeField(default=timezone.now)
    total_downtime_seconds = models.PositiveIntegerField(default=0)

    @property
    def uptime_percentage(self):
        total_tracked_seconds = (timezone.now() - self.tracked_since).total_seconds()
        if total_tracked_seconds <= 0:
            return 100.0
        
        current_downtime = 0
        if not self.is_operational and self.outage_started_at:
            current_downtime = (timezone.now() - self.outage_started_at).total_seconds()
            
        total_down = self.total_downtime_seconds + current_downtime
        uptime_ratio = 1.0 - (total_down / total_tracked_seconds)
        return max(0.0, round(uptime_ratio * 100, 2))

    def __str__(self):
        status_text = "Operational" if self.is_operational else "Outage"
        return f"{self.service_name} • {status_text} • {self.uptime_percentage}% Uptime"

class ScraperExecutionLog(models.Model):
    """
    Records the result of each scraper execution.
    Written directly by the scraper after each run.
    """
    STATUS_CHOICES = [
        ('success', 'Success'),
        ('error', 'Error'),
        ('partial', 'Partial Success'),
    ]

    scraper_name = models.CharField(
        max_length=255,
        help_text="Identifier matching the Service (e.g., 'dispatcher-booked-scraper')"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    error_message = models.TextField(blank=True, null=True, help_text="Error traceback if failed")
    records_processed = models.PositiveIntegerField(
        default=0,
        help_text="Number of records successfully processed/inserted"
    )
    execution_time_seconds = models.FloatField(
        blank=True, null=True,
        help_text="Total execution time in seconds"
    )
    details = models.JSONField(
        blank=True, null=True,
        help_text="Additional execution context (e.g., counts, URLs visited)"
    )
    executed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-executed_at']
        verbose_name = 'Scraper Execution Log'
        verbose_name_plural = 'Scraper Execution Logs'
        indexes = [
            models.Index(fields=['scraper_name', '-executed_at']),
        ]

    def __str__(self):
        return f"{self.scraper_name} — {self.status} @ {self.executed_at:%Y-%m-%d %H:%M}"


class Incident(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('resolved', 'Resolved'),
    ]

    service_name = models.CharField(max_length=255, help_text="The scraper or service name (e.g. dispatcher-booked-scraper)")
    title = models.CharField(max_length=255)
    description = models.TextField(help_text="Error description or traceback")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(default=timezone.now)
    resolved_at = models.DateTimeField(blank=True, null=True)
    resolution_description = models.TextField(blank=True, null=True, help_text="Auto added description when resolved")

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_status_display()}] {self.service_name} - {self.title}"

