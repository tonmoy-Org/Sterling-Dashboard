from rest_framework import serializers
from .models import InvoiceProficiency, InvoiceProficiencySeen
from .utils import calculate_worth_time, compute_total_worth_hours, compute_item_breakdown

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
    summary = serializers.CharField(source='wo_summary')
    hoursWorked = serializers.FloatField(source='worked_time_hours')
    
    # Calculate worth dynamic for existing data
    worthHours = serializers.SerializerMethodField()
    lineItems = serializers.SerializerMethodField()
    
    # Summary Fields
    countedItems = serializers.SerializerMethodField()
    ignoredItems = serializers.SerializerMethodField()
    totalItemTime = serializers.SerializerMethodField()
    
    is_seen = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    # Error fields
    dateDiff = serializers.SerializerMethodField()
    dateError = serializers.BooleanField(source='is_error')
    errorType = serializers.CharField(source='error_type')

    class Meta:
        model = InvoiceProficiency
        fields = [
            'id', 'technician', 'hasInvoice', 'assignmentComplete', 'completedDate',
            'invoiceDate', 'proficiency', 'invoiceTotal', 'priority', 'task',
            'workOrderNumber', 'customerName', 'summary', 'hoursWorked', 'worthHours', 
            'lineItems', 'countedItems', 'ignoredItems', 'totalItemTime', 
            'is_seen', 'is_deleted', 'deleted_date', 'deleted_by', 'deleted_by_email',
            'createdAt', 'is_error', 'error_type', 'dateDiff', 'dateError', 'errorType'
        ]

    def get_dateDiff(self, obj):
        if obj.work_order_date and obj.invoice_date:
            return abs((obj.work_order_date - obj.invoice_date).days)
        return 0

    def get_hasInvoice(self, obj):
        return bool(obj.invoice_number)

    def get_worthHours(self, obj):
        return obj.invoiced_time_hours

    def get_totalItemTime(self, obj):
        return obj.invoiced_time_hours

    def get_proficiency(self, obj):
        # Return as ratio (e.g. 0.85 for 85%) for frontend compatibility
        return round(obj.proficiency_percentage / 100.0, 4) if obj.proficiency_percentage else 0.0

    def get_lineItems(self, obj):
        items = obj.items_detail or []
        result = []
        for i in items:
            item_num = i.get("item", "")
            qty = float(i.get("qty") or 1)
            rate = i.get("total_sold", i.get("rate", 0))
            
            # If rate is "-" or 0, worth is 0
            if rate == "-" or rate == 0 or rate == 0.0:
                worth_per_unit = 0.0
            else:
                worth_per_unit = calculate_worth_time(item_num)

            worth_total = round(worth_per_unit * qty, 4)
            
            # Get the exact math breakdown string and worth in minutes
            worth_min, breakdown = compute_item_breakdown(item_num, qty, rate)
            
            result.append({
                "itemNumber": item_num,
                "qty": qty,
                "rate": i.get("raw_rate") or i.get("total_sold", i.get("rate", 0)),
                "worth": worth_total,
                "worthMin": worth_min,
                "breakdown": breakdown,
                "isCounted": worth_per_unit > 0
            })
        return result

    def get_countedItems(self, obj):
        items = obj.items_detail or []
        count = 0
        for i in items:
            item_num = i.get("item", "")
            rate = i.get("total_sold", i.get("rate", 0))
            if rate != "-" and rate != 0 and rate != 0.0:
                if calculate_worth_time(item_num) > 0:
                    count += 1
        return count

    def get_ignoredItems(self, obj):
        items = obj.items_detail or []
        count = 0
        for i in items:
            if calculate_worth_time(i.get("item", "")) == 0:
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
