from rest_framework import serializers
from .models import WorkOrder, WorkOrderSeen

class WorkOrderSeenSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkOrderSeen
        fields = '__all__'

class WorkOrderSerializer(serializers.ModelSerializer):
    user_seen_records = WorkOrderSeenSerializer(many=True, read_only=True)

    class Meta:
        model = WorkOrder
        fields = '__all__'
