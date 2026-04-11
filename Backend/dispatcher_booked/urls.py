from rest_framework.routers import DefaultRouter

from .views import DispatcherBookedViewSet

router = DefaultRouter()
router.register(r"dispatcher-booked", DispatcherBookedViewSet, basename="dispatcher-booked")

urlpatterns = router.urls
