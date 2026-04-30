from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvoiceProficiencyViewSet

router = DefaultRouter()
router.register(r'records', InvoiceProficiencyViewSet, basename='invoice-proficiency')

urlpatterns = [
    path('', include(router.urls)),
]
