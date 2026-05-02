from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TimeTrackingViewSet

router = DefaultRouter()
router.register(r'', TimeTrackingViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
