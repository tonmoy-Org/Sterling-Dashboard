from rest_framework import viewsets
from .models import TimeTracking
from .serializers import TimeTrackingSerializer

class TimeTrackingViewSet(viewsets.ModelViewSet):
    queryset = TimeTracking.objects.all()
    serializer_class = TimeTrackingSerializer
    filterset_fields = ['user', 'date']
