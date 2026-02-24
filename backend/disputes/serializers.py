from rest_framework import serializers
from .models import Dispute, DisputeMessage


class DisputeCreateSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    vendor_id = serializers.IntegerField(required=False)
    subject = serializers.CharField(max_length=180)
    description = serializers.CharField()


class DisputeSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    vendor_store_name = serializers.CharField(source="vendor.store_name", read_only=True)
    order_id = serializers.IntegerField(source="order.id", read_only=True)
    assigned_admin_email = serializers.EmailField(source="assigned_admin.email", read_only=True)

    class Meta:
        model = Dispute
        fields = [
            "id",
            "order_id",
            "vendor",
            "vendor_store_name",
            "created_by",
            "created_by_email",
            "subject",
            "description",
            "status",
            "assigned_admin",
            "assigned_admin_email",
            "resolution_type",
            "resolution_note",
            "resolved_at",
            "created_at",
            "updated_at",
        ]


class DisputeMessageCreateSerializer(serializers.Serializer):
    message = serializers.CharField()


class DisputeMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.EmailField(source="sender.email", read_only=True)

    class Meta:
        model = DisputeMessage
        fields = ["id", "dispute", "sender", "sender_email", "message", "created_at"]
