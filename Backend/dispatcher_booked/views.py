from rest_framework.response import Response
from rest_framework import viewsets, status
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter

from .models import DispatcherBooked, DispatcherBookedSeen
from .serializers import DispatcherBookedSerializer, DispatcherBookedSeenSerializer
import django_filters


class DispatcherBookedSeenViewSet(viewsets.ModelViewSet):
    queryset = DispatcherBookedSeen.objects.all().order_by("-id")
    serializer_class = DispatcherBookedSeenSerializer
    filter_backends = [DjangoFilterBackend]


class DispatcherBookedFilter(django_filters.FilterSet):
    class Meta:
        model = DispatcherBooked
        fields = "__all__"


class DispatcherBookedViewSet(viewsets.ModelViewSet):
    queryset = DispatcherBooked.objects.all().order_by("-id")
    serializer_class = DispatcherBookedSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = DispatcherBookedFilter
    search_fields = "__all__"
    ordering_fields = "__all__"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        return Response(
            {
                "message": getattr(instance, "_message", "Success"),
                "data": self.get_serializer(instance).data,
            },
            status=status.HTTP_200_OK,
        )
