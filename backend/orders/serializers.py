from rest_framework import serializers
from .models import CartItem, Order, OrderItem


class CartItemSerializer(serializers.ModelSerializer):
    offer_id = serializers.IntegerField(source="offer.id", read_only=True)
    product_name = serializers.CharField(source="offer.catalog_product.name", read_only=True)
    vendor_name = serializers.CharField(source="offer.vendor.store_name", read_only=True)
    price = serializers.FloatField(source="offer.price", read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["id", "offer_id", "product_name", "vendor_name", "price", "quantity", "total", "created_at"]

    def get_total(self, obj):
        return float(obj.offer.price) * int(obj.quantity)


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="catalog_product.name", read_only=True)
    vendor_name = serializers.CharField(source="vendor.store_name", read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "offer", "product_name", "vendor_name", "unit_price", "quantity", "line_total"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ["id", "status", "total_amount", "created_at", "items"]
