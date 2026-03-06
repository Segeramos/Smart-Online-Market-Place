from decimal import Decimal
from rest_framework import serializers

from vendors.models import Vendor
from orders.models import Order
from .models import CommissionSetting, CommissionLog


# ---------------------------
# Vendors
# ---------------------------

class VendorSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Vendor
        fields = [
            "id",
            "user",
            "user_email",
            "store_name",
            "description",
            "status",
            "is_active",
            "commission_rate",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class VendorStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Vendor.Status.choices)
    is_active = serializers.BooleanField(required=False)


class VendorCommissionSerializer(serializers.Serializer):
    commission_rate = serializers.DecimalField(max_digits=5, decimal_places=2)

    def validate_commission_rate(self, value: Decimal):
        if value < 0 or value > 100:
            raise serializers.ValidationError("commission_rate must be between 0 and 100.")
        return value


# ---------------------------
# Orders
# ---------------------------

class AdminOrderSerializer(serializers.ModelSerializer):
    order_id = serializers.CharField(source="id", read_only=True)
    user_id = serializers.CharField(source="user.id", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Order
        fields = [
            "order_id",
            "user_id",
            "user_email",
            "status",
            "payment_status",
            "payment_method",
            "total_amount",
            "paid_at",
            "created_at",
        ]


# ---------------------------
# Phase 7.2: Global Commission + Logs
# ---------------------------

class CommissionSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommissionSetting
        fields = ["id", "default_commission_rate", "is_active", "created_at", "updated_at"]


class UpdateCommissionSettingSerializer(serializers.Serializer):
    default_commission_rate = serializers.DecimalField(max_digits=5, decimal_places=2)

    def validate_default_commission_rate(self, value: Decimal):
        if value < 0 or value > 100:
            raise serializers.ValidationError("default_commission_rate must be between 0 and 100.")
        return value


class CommissionLogSerializer(serializers.ModelSerializer):
    admin_email = serializers.EmailField(source="admin_user.email", read_only=True)
    vendor_store_name = serializers.CharField(source="vendor.store_name", read_only=True)

    class Meta:
        model = CommissionLog
        fields = [
            "id",
            "action",
            "admin_email",
            "vendor",
            "vendor_store_name",
            "old_value",
            "new_value",
            "note",
            "created_at",
        ]
