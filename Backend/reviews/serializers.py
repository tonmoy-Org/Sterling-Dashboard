from rest_framework import serializers
from .models import Employee, Platform, Review

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = '__all__'

class PlatformSerializer(serializers.ModelSerializer):
    class Meta:
        model = Platform
        fields = '__all__'

class ReviewSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.name')
    platform_name = serializers.ReadOnlyField(source='platform.name')

    class Meta:
        model = Review
        fields = '__all__'
