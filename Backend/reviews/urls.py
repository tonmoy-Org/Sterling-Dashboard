from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, PlatformViewSet, ReviewViewSet

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet)
router.register(r'platforms', PlatformViewSet)
router.register(r'reviews', ReviewViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
