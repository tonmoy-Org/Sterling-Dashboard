from rest_framework import serializers
from .models import InvoiceProficiency, InvoiceProficiencySeen

class InvoiceProficiencySerializer(serializers.ModelSerializer):
    technician = serializers.CharField(source='technician_name')
    hasInvoice = serializers.SerializerMethodField()
    assignmentComplete = serializers.BooleanField(source='assignment_completed')
    completedDate = serializers.DateField(source='work_order_date')
    invoiceDate = serializers.DateField(source='invoice_date')
    proficiency = serializers.SerializerMethodField()
    invoiceTotal = serializers.FloatField(source='total_amount')
    task = serializers.CharField(source='task_name')
    workOrderNumber = serializers.CharField(source='work_order_number')
    customerName = serializers.CharField(source='customer_name')
    summary = serializers.CharField(source='work_order_summary')
    hoursWorked = serializers.FloatField(source='worked_time_hours')
    worthHours = serializers.FloatField(source='invoiced_time_hours')
    lineItems = serializers.SerializerMethodField()
    
    is_seen = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceProficiency
        fields = [
            'id', 'technician', 'hasInvoice', 'assignmentComplete', 'completedDate',
            'invoiceDate', 'proficiency', 'invoiceTotal', 'priority', 'task',
            'workOrderNumber', 'customerName', 'summary', 'hoursWorked', 'worthHours', 
            'lineItems', 'is_seen', 'is_deleted', 'deleted_date', 'deleted_by', 'deleted_by_email'
        ]

    def get_hasInvoice(self, obj):
        return bool(obj.invoice_number)

    def get_proficiency(self, obj):
        # Convert 100.0 (100%) to 1.0 (ratio) for frontend consumption
        return obj.proficiency_percentage / 100.0 if obj.proficiency_percentage else 0.0

    def get_lineItems(self, obj):
        # Map internal item detail naming to frontend camelCase
        # Internal: [{"item": "...", "qty": 1.0, "description": "...", "rate": 0.0, "worth": 1.0}]
        # Frontend: [{ itemNumber, description, qty, rate }]
        items = obj.items_detail or []
        return [
            {
                "itemNumber": i.get("item", ""),
                "description": i.get("description", ""),
                "qty": i.get("qty", 1),
                "rate": i.get("rate", 0),
                "worth": i.get("worth", 0)
            }
            for i in items
        ]

    def get_is_seen(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and user.is_authenticated:
            return InvoiceProficiencySeen.objects.filter(user=user, invoice_proficiency=obj).exists()
        return False

class InvoiceProficiencySeenSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceProficiencySeen
        fields = ['user', 'invoice_proficiency', 'seen_at']
