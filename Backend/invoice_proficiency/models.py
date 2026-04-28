import re
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

    @staticmethod
    def calculate_worth_time(item_name):
        """
        Extract the time value (in decimal hours) from an item code string.

        Rules:
          - Items ending with HR  (e.g. '--1HR', '--1.5HR') → time in hours.
          - Items ending with MIN (e.g. '--30MIN', '--15MIN') → converted to hours (1 min = 1/60 or approx 0.0167).
          - Items ending with 0 or 0H (e.g. '--0', '--0H')   → ignored, return 0.0.
          - Anything else with no time suffix                 → return 0.0.

        Examples:
          '0PP1SEP--1HR'   → 1.0
          '4PS1FLO--30MIN' → 0.5
          '2PS1HDF--0H'    → 0.0  (ignored)
          '6PS1DEF--0'     → 0.0  (ignored)
        """
        if not item_name:
            return 0.0

        # Normalize stylized characters (bold, etc.) to plain ASCII
        # and strip whitespace
        import unicodedata
        name = unicodedata.normalize('NFKC', str(item_name)).strip()

        # Rule 1 — Exclude items whose suffix is explicitly 0 or 0H (common for fees/notes)
        # We look for patterns like --0, --0H, or just 0, 0H at the end of the string
        if re.search(r'(?:--|\s|^-)0H?$', name, re.IGNORECASE):
            return 0.0

        # Rule 2 — Match HRS / HR suffix (e.g. --1HR, --1.5HRS)
        # We look for digits before HR/HRS. We check for a separator like -- or space to be safe.
        hr_match = re.search(r'(?:--|\s|^)(\d+\.?\d*)\s*(?:HRS?)', name, re.IGNORECASE)
        if hr_match:
            try:
                return float(hr_match.group(1))
            except (ValueError, TypeError):
                pass
        
        # Fallback for HR if no separator found, but only if it's the end of the string
        hr_match_fallback = re.search(r'(\d+\.?\d*)\s*(?:HRS?)$', name, re.IGNORECASE)
        if hr_match_fallback:
            try:
                return float(hr_match_fallback.group(1))
            except (ValueError, TypeError):
                pass

        # Rule 3 — Match MIN suffix (e.g. --30MIN)
        min_match = re.search(r'(?:--|\s|^)(\d+\.?\d*)\s*MIN', name, re.IGNORECASE)
        if min_match:
            try:
                minutes = float(min_match.group(1))
                # Using 0.0167 as per specific project requirement for "1 min = 0.0167 hr"
                # However, for common values like 30 or 60, we should ensure they hit the clean 0.5/1.0
                if minutes == 30: return 0.5
                if minutes == 60: return 1.0
                if minutes == 15: return 0.25
                return round(minutes * 0.0167, 4)
            except (ValueError, TypeError):
                pass

        return 0.0

    @staticmethod
    def calculate_worth_time_display(minutes):
        """
        Convert raw minutes (from Worked Time column) to decimal hours.
        1 minute = 0.0167 hours (as per project requirement).
        """
        try:
            val = float(minutes)
            # Check for common values to avoid floating point noise from 0.0167
            if val == 60: return 1.0
            if val == 120: return 2.0
            if val == 30: return 0.5
            return round(val * 0.0167, 4)
        except (TypeError, ValueError):
            return 0.0

    def compute_invoiced_time(self):
        """
        Calculate total invoiced time (hours) from stored items_detail.
        Called automatically in save().
        """
        total = 0.0
        for item in (self.items_detail or []):
            item_name = item.get("item", "")
            try:
                qty = float(item.get("qty") or 1)
            except (TypeError, ValueError):
                qty = 1.0
            worth_per_unit = self.calculate_worth_time(item_name)
            total += worth_per_unit * qty
        return round(total, 3)

    def compute_proficiency(self):
        """
        Calculate proficiency percentage.
        Formula: (invoiced_time_hours / worked_time_hours) * 100
        Returns 0.0 if worked_time_hours is zero.
        """
        if self.worked_time_hours and self.worked_time_hours > 0:
            return round((self.invoiced_time_hours / self.worked_time_hours) * 100, 2)
        return 0.0

    def save(self, *args, **kwargs):
        """
        Auto-calculate invoiced_time_hours and proficiency_percentage
        from items_detail every time the record is saved.
        """
        self.invoiced_time_hours = self.compute_invoiced_time()
        self.proficiency_percentage = self.compute_proficiency()
        super().save(*args, **kwargs)

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
