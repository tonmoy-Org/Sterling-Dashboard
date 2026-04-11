from django.urls import path

from . import views

urlpatterns = [
    # Public endpoints
    path('', views.overall_status, name='health-check-overall'),
    path('services/', views.service_list, name='health-check-services'),
    path('services/<int:pk>/', views.service_detail, name='health-check-service-detail'),
    path('uptime/', views.uptime_metrics, name='health-check-uptime'),
    path('incidents/', views.incident_list, name='health-check-incidents'),
    path('incidents/history/', views.incident_history, name='health-check-incidents-history'),

    # Admin endpoints (auth required)
    path('check-now/', views.check_now, name='health-check-now'),
    path('incidents/<int:pk>/acknowledge/', views.acknowledge_incident, name='health-check-acknowledge'),
]
