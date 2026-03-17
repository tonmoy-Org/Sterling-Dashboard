from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import WorkOrder, WorkOrderSeen
from .serializers import WorkOrderSerializer, WorkOrderSeenSerializer   

class WorkOrderListCreateView(generics.ListCreateAPIView):
    queryset = WorkOrder.objects.all()
    serializer_class = WorkOrderSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    # Filter on all standard basic fields except JSONField to avoid filter errors
    filterset_fields = [f.name for f in WorkOrder._meta.fields if f.get_internal_type() != 'JSONField']
    search_fields = ['customerName', 'workOrderSummary', 'technicianName', 'status', 'wo']
    ordering_fields = '__all__'

class WorkOrderRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = WorkOrder.objects.all()
    serializer_class = WorkOrderSerializer

class WorkOrderSeenListCreateView(generics.ListCreateAPIView):
    queryset = WorkOrderSeen.objects.all()
    serializer_class = WorkOrderSeenSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user', 'work_order']

class WorkOrderSeenRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = WorkOrderSeen.objects.all()
    serializer_class = WorkOrderSeenSerializer
