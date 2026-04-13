from rest_framework.routers import DefaultRouter

from .views import DispatcherBookedViewSet, DispatcherBookedSeenViewSet

router = DefaultRouter()
router.register(r"dispatcher-booked", DispatcherBookedViewSet, basename="dispatcher-booked")
router.register(r"dispatcher-booked-seen", DispatcherBookedSeenViewSet, basename="dispatcher-booked-seen")

urlpatterns = router.urls
