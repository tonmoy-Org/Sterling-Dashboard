from django.db import models
from django.utils import timezone
from accounts.models import User

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
    worked_time_hours = models.FloatField(default=0.0, help_text="Time worked in decimal hours")
    invoiced_time_hours = models.FloatField(default=0.0, help_text="Total worth of invoiced items in hours")
    proficiency_percentage = models.FloatField(default=0.0, help_text="Invoiced Time / Worked Time * 100")
    
    # Financials
    total_amount = models.FloatField(default=0.0, help_text="Invoice Total")
    
    # Attributes for Reporting/Filtering
    customer_name = models.CharField(max_length=255, blank=True, null=True)
    priority = models.CharField(max_length=100, blank=True, null=True)
    task_name = models.CharField(max_length=255, blank=True, null=True)
    
    # Drill-down data
    # Stores details of items: [{"item": "...", "qty": 1.0, "description": "...", "rate": 0.0, "worth": 1.0}]
    items_detail = models.JSONField(default=list, blank=True, help_text="Item numbers, quantities, and worth values")
    
    work_order_summary = models.TextField(blank=True, null=True)
    
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
        return f"WO {self.work_order_number} - {self.technician_name} ({self.proficiency_percentage}%)"


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
