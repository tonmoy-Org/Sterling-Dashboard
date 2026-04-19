from django.db import models
from django.utils import timezone

class Review(models.Model):
    reviewer_name = models.CharField(max_length=255, default="")
    rating_text = models.CharField(max_length=50, blank=True, null=True)
    rating_value = models.IntegerField(default=0)
    review_date = models.CharField(max_length=100, blank=True, null=True)
    review_text = models.TextField(blank=True, null=True)
    price_assessment = models.CharField(max_length=255, blank=True, null=True)
    price_range = models.CharField(max_length=255, blank=True, null=True)
    services_mentioned = models.TextField(blank=True, null=True)
    
    business_name = models.CharField(max_length=255, default="Google - Sterling Septic & Plumbing LLC")
    
    # Soft deletion fields
    deleted_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who deleted the record")
    deleted_by_email = models.EmailField(max_length=255, null=True, blank=True, help_text="Email of the user who deleted the record")
    deleted_date = models.DateTimeField(null=True, blank=True, help_text="Date of deletion")
    is_deleted = models.BooleanField(null=True, blank=True, default=False, help_text="Soft delete flag")
    
    scraped_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reviewer_name} - {self.rating_value} stars"


class ReviewSeen(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='seen_reviews')
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='user_seen_records')
    seen_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'review_user_seen'
        unique_together = ('user', 'review')

    def __str__(self):
        return f"{self.user} saw {self.review}"
