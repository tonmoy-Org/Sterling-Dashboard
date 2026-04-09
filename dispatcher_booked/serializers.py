from rest_framework import serializers

from .models import DispatcherBooked


class DispatcherBookedSerializer(serializers.ModelSerializer):
    class Meta:
        model = DispatcherBooked
        fields = "__all__"
