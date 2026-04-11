from django.db import models
from django.utils import timezone


class Service(models.Model):
    """
    Represents a monitored service/feature in the Sterling Dashboard.
    Each service is independently health-checked on a schedule.
    """

    CATEGORY_CHOICES = [
        ('scraper', 'Scraper'),
        ('api', 'API Endpoint'),
        ('database', 'Database'),
        ('external', 'External Service'),
    ]

    STATUS_CHOICES = [
        ('operational', 'Operational'),
        ('degraded', 'Degraded Performance'),
        ('partial_outage', 'Partial Outage'),
        ('major_outage', 'Major Outage'),
    ]

    name = models.CharField(max_length=255, unique=True, help_text="Display name of the service")
    slug = models.SlugField(max_length=255, unique=True, help_text="URL-safe identifier")
    description = models.TextField(blank=True, null=True, help_text="Brief description of the service")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, help_text="Service category")
    current_status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='operational',
        help_text="Current operational status"
    )
    is_active = models.BooleanField(default=True, help_text="Whether this service is being monitored")
    display_order = models.PositiveIntegerField(default=0, help_text="Order in which to display on status page")

    # Check configuration
    check_type = models.CharField(
        max_length=50,
        default='auto',
        help_text="Type of health check (auto, manual)"
    )
    freshness_threshold_minutes = models.PositiveIntegerField(
        default=30,
        help_text="Minutes of no activity before flagging as degraded"
    )
    outage_threshold_minutes = models.PositiveIntegerField(
        default=60,
        help_text="Minutes of no activity before flagging as outage"
    )

    # Timestamps
    last_checked_at = models.DateTimeField(blank=True, null=True, help_text="Last time this service was checked")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'name']
        verbose_name = 'Monitored Service'
        verbose_name_plural = 'Monitored Services'

    def __str__(self):
        return f"{self.name} ({self.get_current_status_display()})"


class HealthCheck(models.Model):
    """
    Records the result of each individual health check run.
    Used to calculate uptime percentages and detect status transitions.
    """

    STATUS_CHOICES = [
        ('healthy', 'Healthy'),
        ('degraded', 'Degraded'),
        ('unhealthy', 'Unhealthy'),
    ]

    service = models.ForeignKey(
        Service,
        on_delete=models.CASCADE,
        related_name='health_checks',
        help_text="The service that was checked"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, help_text="Result of the check")
    response_time_ms = models.PositiveIntegerField(
        blank=True, null=True,
        help_text="Response time in milliseconds"
    )
    error_message = models.TextField(blank=True, null=True, help_text="Error details if check failed")
    details = models.JSONField(
        blank=True, null=True,
        help_text="Additional check details (e.g., last record timestamp)"
    )
    checked_at = models.DateTimeField(default=timezone.now, help_text="When this check was performed")

    class Meta:
        ordering = ['-checked_at']
        verbose_name = 'Health Check'
        verbose_name_plural = 'Health Checks'
        indexes = [
            models.Index(fields=['service', '-checked_at']),
            models.Index(fields=['-checked_at']),
        ]

    def __str__(self):
        return f"{self.service.name} — {self.status} @ {self.checked_at:%Y-%m-%d %H:%M}"


class Incident(models.Model):
    """
    Tracks downtime events for a service.
    Created when a service transitions from operational to degraded/outage.
    Resolved when the service comes back online.
    """

    SEVERITY_CHOICES = [
        ('minor', 'Minor'),
        ('major', 'Major'),
        ('critical', 'Critical'),
    ]

    service = models.ForeignKey(
        Service,
        on_delete=models.CASCADE,
        related_name='incidents',
        help_text="The affected service"
    )
    title = models.CharField(max_length=500, help_text="Short description of the incident")
    description = models.TextField(blank=True, null=True, help_text="Detailed description of the issue")
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='major')

    # Timeline
    started_at = models.DateTimeField(default=timezone.now, help_text="When the incident started")
    acknowledged_at = models.DateTimeField(blank=True, null=True, help_text="When someone acknowledged it")
    resolved_at = models.DateTimeField(blank=True, null=True, help_text="When the service recovered")

    # Duration (seconds) — computed on resolution
    duration_seconds = models.PositiveIntegerField(
        blank=True, null=True,
        help_text="Total downtime in seconds"
    )

    # Status tracking
    is_resolved = models.BooleanField(default=False, help_text="Whether the incident has been resolved")
    is_acknowledged = models.BooleanField(default=False, help_text="Whether someone has acknowledged it")

    # Email tracking
    alert_sent = models.BooleanField(default=False, help_text="Whether downtime alert email was sent")
    recovery_sent = models.BooleanField(default=False, help_text="Whether recovery email was sent")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-started_at']
        verbose_name = 'Incident'
        verbose_name_plural = 'Incidents'
        indexes = [
            models.Index(fields=['service', '-started_at']),
            models.Index(fields=['is_resolved', '-started_at']),
        ]

    def __str__(self):
        status = "Resolved" if self.is_resolved else "Active"
        return f"[{status}] {self.service.name}: {self.title}"

    @property
    def duration_display(self):
        """Human-readable duration string."""
        if not self.duration_seconds:
            if not self.is_resolved:
                # Still ongoing — calculate live duration
                delta = timezone.now() - self.started_at
                seconds = int(delta.total_seconds())
            else:
                return "N/A"
        else:
            seconds = self.duration_seconds

        hours, remainder = divmod(seconds, 3600)
        minutes, secs = divmod(remainder, 60)

        if hours > 0:
            return f"{hours}h {minutes}m"
        elif minutes > 0:
            return f"{minutes}m {secs}s"
        else:
            return f"{secs}s"

    def resolve(self):
        """Mark this incident as resolved and calculate duration."""
        self.resolved_at = timezone.now()
        self.is_resolved = True
        self.duration_seconds = int((self.resolved_at - self.started_at).total_seconds())
        self.save()


class ScraperExecutionLog(models.Model):
    """
    Records the result of each scraper execution.
    Written directly by the scraper after each run — this is how the
    health checker KNOWS if the scraper ran successfully vs threw an error.

    Unlike HealthCheck (which runs on a separate schedule and infers status),
    this is the ground-truth execution log from the scraper itself.
    """

    STATUS_CHOICES = [
        ('success', 'Success'),
        ('error', 'Error'),
        ('partial', 'Partial Success'),
    ]

    scraper_name = models.CharField(
        max_length=255,
        help_text="Identifier matching the Service slug (e.g., 'dispatcher-booked-scraper')"
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

