from django.contrib import admin
from .models import InvoiceProficiency, InvoiceProficiencySeen

@admin.register(InvoiceProficiency)
class InvoiceProficiencyAdmin(admin.ModelAdmin):
    list_display = ('work_order_number', 'technician_name', 'date', 'proficiency_percentage', 'total_amount')
    list_filter = ('date', 'technician_name', 'priority')
    search_fields = ('work_order_number', 'technician_name', 'customer_name')

@admin.register(InvoiceProficiencySeen)
class InvoiceProficiencySeenAdmin(admin.ModelAdmin):
    list_display = ('user', 'invoice_proficiency', 'seen_at')
    list_filter = ('seen_at', 'user')
