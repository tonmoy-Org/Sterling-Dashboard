# sterling_dashboard/urls.py

from django.contrib import admin
from django.urls import path, include
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions

schema_view = get_schema_view(
   openapi.Info(
      title="Sterling Dashboard API",
      default_version='v1',
      description="API documentation for Sterling Dashboard",
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
   path('admin/', admin.site.urls),
   path('api/', include('accounts.urls')),
   path('api/', include('locates.urls')),
   path('api/', include('tank_repair.urls')),
   path('api/', include('work_order.urls')),
   path('api/', include('dispatcher_booked.urls')),
   path('api/health-check/', include('status.urls')),
   path('api/reviews/', include('reviews.urls')),
   path('api/invoice-proficiency/', include('invoice_proficiency.urls')),
   path('api/time-tracking/', include('time_tracking.urls')),
   path('api/callrail/', include('callrail.urls')),
    
    # --- API Documentation URLs ---
   path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
   path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]
