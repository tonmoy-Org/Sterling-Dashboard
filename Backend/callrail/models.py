from django.db import models

class CallRailWebhook(models.Model):
    payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Webhook {self.id} - {self.created_at}"

    class Meta:
        ordering = ['-created_at']
