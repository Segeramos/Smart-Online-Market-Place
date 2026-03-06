from rest_framework import serializers
from .models import Vendor

class VendorSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    user = serializers.CharField()  # email of the user
    store_name = serializers.CharField()
    description = serializers.CharField(allow_blank=True)

    def create(self, validated_data):
        from accounts.models import User
        user_email = validated_data.pop('user')
        user = User.objects.get(email=user_email)
        vendor = Vendor(
            user=user,
            **validated_data
        )
        vendor.save()
        return vendor
