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
    
    # Summary Fields
    countedItems = serializers.SerializerMethodField()
    ignoredItems = serializers.SerializerMethodField()
    totalItemTime = serializers.FloatField(source='invoiced_time_hours')
    
    is_seen = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = InvoiceProficiency
        fields = [
            'id', 'technician', 'hasInvoice', 'assignmentComplete', 'completedDate',
            'invoiceDate', 'proficiency', 'invoiceTotal', 'priority', 'task',
            'workOrderNumber', 'customerName', 'summary', 'hoursWorked', 'worthHours', 
            'lineItems', 'countedItems', 'ignoredItems', 'totalItemTime', 
            'is_seen', 'is_deleted', 'deleted_date', 'deleted_by', 'deleted_by_email',
            'createdAt'
        ]

    def get_hasInvoice(self, obj):
        return bool(obj.invoice_number)

    def get_proficiency(self, obj):
        # Convert 100.0 (100%) to 1.0 (ratio) for frontend consumption
        return obj.proficiency_percentage / 100.0 if obj.proficiency_percentage else 0.0

    def get_lineItems(self, obj):
        # Map internal item detail naming to frontend camelCase
        items = obj.items_detail or []
        result = []
        for i in items:
            item_num = i.get("item", "")
            qty = float(i.get("qty") or 1)
            worth_per_unit = obj.calculate_worth_time(item_num)
            worth_total = round(worth_per_unit * qty, 3)
            
            result.append({
                "itemNumber": item_num,
                "description": i.get("description", ""),
                "qty": qty,
                "rate": i.get("total_sold", i.get("rate", 0)),
                "worth": worth_total,
                "isCounted": worth_per_unit > 0
            })
        return result

    def get_countedItems(self, obj):
        items = obj.items_detail or []
        count = 0
        for i in items:
            if obj.calculate_worth_time(i.get("item", "")) > 0:
                count += 1
        return count

    def get_ignoredItems(self, obj):
        items = obj.items_detail or []
        count = 0
        for i in items:
            if obj.calculate_worth_time(i.get("item", "")) == 0:
                count += 1
        return count

    def get_is_seen(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and user.is_authenticated:
            return InvoiceProficiencySeen.objects.filter(user=user, invoice_proficiency=obj).exists()
        return False

class InvoiceProficiencySeenSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceProficiencySeen
        fields = ['user', 'invoice_proficiency', 'seen_at']
