from django.db import models
from django.utils import timezone
from accounts.models import User
from .utils import compute_total_worth_hours

class InvoiceProficiency(models.Model):
    """
    Model for tracking Technician Invoice Proficiency.
    Based on comparison between Work Performance (Worked Time) 
    and Invoiced Items (Worth Time).
    """
    # Primary lookup
    work_order_number = models.CharField(max_length=100, unique=True)
    technician_name = models.CharField(max_length=255)
    work_order_date = models.DateField()
    
    # Identification
    invoice_number = models.CharField(max_length=100, blank=True, null=True)
    invoice_date = models.DateField(blank=True, null=True)
    assignment_completed = models.BooleanField(default=False)
    
    # Proficiency Metrics
    worked_time_hours = models.FloatField(default=0.0, help_text="Time worked in decimal hours (raw from scraper)")
    invoiced_time_hours = models.FloatField(default=0.0, help_text="Auto-calculated from items_detail worth time")
    proficiency_percentage = models.FloatField(default=0.0, help_text="Auto-calculated: Invoiced Time / Worked Time * 100")
    
    # Financials
    total_amount = models.FloatField(default=0.0, help_text="Invoice Total")
    
    # Attributes for Reporting/Filtering
    customer_name = models.CharField(max_length=255, blank=True, null=True)
    priority = models.CharField(max_length=100, blank=True, null=True)
    task_name = models.CharField(max_length=255, blank=True, null=True)
    
    # Drill-down data
    # Stores raw item data: [{"item": "0PP1SEP--1HR", "qty": 1.0, "description": "...", "rate": 0.0}]
    # 'worth' is NOT stored here — it is calculated live by calculate_worth_time()
    items_detail = models.JSONField(default=list, blank=True, help_text="Raw item data from scraper (no pre-calculated worth)")
    
    wo_summary = models.TextField(blank=True, null=True)
    
    # Error tracking (Date mismatch, missing invoice, etc.)
    is_error = models.BooleanField(default=False)
    error_type = models.CharField(max_length=100, blank=True, null=True, help_text="e.g. DATE_MISMATCH, NO_INVOICE_FOUND")
    
    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Soft delete / Visibility tracking
    is_deleted = models.BooleanField(default=False)
    deleted_by = models.CharField(max_length=255, null=True, blank=True)
    deleted_by_email = models.EmailField(null=True, blank=True)
    deleted_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'invoice_proficiency'
        ordering = ['-work_order_date', '-id']

    def __str__(self):
        return f"WO {self.work_order_number} - {self.technician_name}"

    def compute_invoiced_time(self):
        """
        Calculates the total worth time in hours from the line items.
        """
        return compute_total_worth_hours(self.items_detail)

    def compute_proficiency(self):
        """
        Calculates proficiency percentage based on Worth (Invoiced) Time vs Worked Time.
        """
        if self.worked_time_hours > 0:
            return (self.invoiced_time_hours / self.worked_time_hours) * 100
        return 0.0

    def save(self, *args, **kwargs):
        # 1. Update Invoiced (Worth) Time
        self.invoiced_time_hours = self.compute_invoiced_time()
        
        # 2. Update Proficiency Percentage
        self.proficiency_percentage = self.compute_proficiency()
        
        super().save(*args, **kwargs)


class InvoiceProficiencySeen(models.Model):
    """
    Tracks which users have seen a specific proficiency record (for notification status).
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='seen_invoice_proficiency')
    invoice_proficiency = models.ForeignKey(InvoiceProficiency, on_delete=models.CASCADE, related_name='user_seen_records')
    seen_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'invoice_proficiency_user_seen'
        unique_together = ('user', 'invoice_proficiency')

    def __str__(self):
        return f"{self.user} saw proficiency for WO {self.invoice_proficiency.work_order_number}"
