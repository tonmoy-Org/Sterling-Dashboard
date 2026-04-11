from django.db import models
from accounts.models import User
from django.utils import timezone


class WorkOrder(models.Model):
    tag = models.JSONField(default=list, blank=True, null=True, help_text="List of tags")
    customerName = models.CharField(max_length=255, blank=True, null=True)
    workOrderAddress = models.TextField(blank=True, null=True)
    workOrderSummary = models.TextField(blank=True, null=True)
    workOrderLink = models.URLField(max_length=1000, blank=True, null=True)
    quoteLink = models.URLField(max_length=1000, blank=True, null=True)
    technicianName = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=100, blank=True, null=True)
    wo = models.CharField(max_length=100, unique=True)
    note = models.TextField(blank=True, null=True)
    completedNote = models.TextField(blank=True, null=True)
    createdAt = models.DateTimeField(default=timezone.now)
    viewedAt = models.DateTimeField(blank=True, null=True)
    completedAt = models.DateTimeField(blank=True, null=True)
    submittedAt = models.DateTimeField(blank=True, null=True)
    deleted_by = models.CharField(max_length=255, blank=True, null=True)
    deleted_by_email = models.EmailField(blank=True, null=True)
    deleted_date = models.DateTimeField(blank=True, null=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'work_orders'
        ordering = ['-createdAt']

    def __str__(self):
        return f"{self.wo} - {self.customerName}"


class WorkOrderSeen(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='seen_work_orders')
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name='user_seen_records')
    seen_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'work_order_user_seen'
        unique_together = ('user', 'work_order')

    def __str__(self):
        return f"{self.user} saw {self.work_order.wo}"
