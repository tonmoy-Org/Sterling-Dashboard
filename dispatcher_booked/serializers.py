from rest_framework import serializers
from .models import DispatcherBooked


class DispatcherBookedSerializer(serializers.ModelSerializer):

    class Meta:
        model = DispatcherBooked
        fields = "__all__"

    def create(self, validated_data):
        date = validated_data.get("date")

        instance = DispatcherBooked.objects.filter(date=date).first()

        if instance:
            # 👉 check values changed or not
            is_same = True
            for field, value in validated_data.items():
                if getattr(instance, field) != value:
                    is_same = False
                    break

            if is_same:
                instance._message = "Data already exists"
                return instance

            # 🔄 update only changed values
            for field, value in validated_data.items():
                setattr(instance, field, value)

            instance.save()
            instance._message = "Data updated"
            return instance

        # ✅ create new
        instance = super().create(validated_data)
        instance._message = "Data created"
        return instance