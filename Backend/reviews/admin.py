from django.contrib import admin
from .models import Employee, Platform, Review

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(Platform)
class PlatformAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('employee', 'platform', 'rating', 'created_at')
    list_filter = ('platform', 'rating', 'created_at')
    search_fields = ('employee__name', 'review_text')
