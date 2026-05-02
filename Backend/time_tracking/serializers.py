from rest_framework import serializers
from .models import TimeTracking
from accounts.models import User

class TimeTrackingSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.name')
    user_email = serializers.ReadOnlyField(source='user.email')

    class Meta:
        model = TimeTracking
        fields = '__all__'
