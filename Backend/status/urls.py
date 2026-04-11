from django.urls import path

from . import views

urlpatterns = [
    # Exposing ServiceStatus via API
    path('services/', views.service_status_list, name='service-status-list'),

    # Exposing ScraperExecutionLog via API
    path('logs/', views.scraper_log_list, name='scraper-log-list'),
    path('logs/<int:pk>/', views.scraper_log_detail, name='scraper-log-detail'),
]

