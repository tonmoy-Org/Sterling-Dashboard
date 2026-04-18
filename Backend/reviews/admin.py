from django.contrib import admin
from .models import Review

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('reviewer_name', 'rating_value', 'price_range', 'is_deleted', 'created_at')
    list_filter = ('rating_value', 'is_deleted', 'created_at')
    search_fields = ('reviewer_name', 'review_text', 'services_mentioned')
