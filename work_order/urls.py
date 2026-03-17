from django.urls import path
from .views import (
    WorkOrderListCreateView,
    WorkOrderRetrieveUpdateDestroyView,
    WorkOrderSeenListCreateView,
    WorkOrderSeenRetrieveUpdateDestroyView
)

app_name = 'work_order'

urlpatterns = [
    path('work-orders/', WorkOrderListCreateView.as_view(), name='work-order-list-create'),
    path('work-orders/<int:pk>/', WorkOrderRetrieveUpdateDestroyView.as_view(), name='work-order-detail'),
    path('work-orders/seen/', WorkOrderSeenListCreateView.as_view(), name='user-seen-list-create'),
    path('work-orders/seen/<int:pk>/', WorkOrderSeenRetrieveUpdateDestroyView.as_view(), name='user-seen-detail'),
]
