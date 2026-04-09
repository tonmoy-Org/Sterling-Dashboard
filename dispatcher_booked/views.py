import django_filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter

from .models import DispatcherBooked
from .serializers import DispatcherBookedSerializer


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
