from rest_framework import serializers
from vendors.models import Vendor
from orders.models import Order, OrderItem

class VendorSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    store_name = serializers.CharField()
    status = serializers.CharField()
    commission = serializers.FloatField()

class VendorStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["active", "suspended"])

class VendorCommissionSerializer(serializers.Serializer):
    commission = serializers.FloatField()

class AdminOrderSerializer(serializers.Serializer):
    order_id = serializers.CharField()
    user_id = serializers.CharField()
    status = serializers.CharField()
    total_amount = serializers.FloatField()
