from django.urls import path
from . import views

urlpatterns = [
    path('webhook/', views.callrail_webhook, name='callrail_webhook'),
    path('logs/', views.get_webhooks, name='callrail_logs'),
]
