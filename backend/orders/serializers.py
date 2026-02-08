from rest_framework import serializers
from .models import CartItem, Order, OrderItem
from products.serializers import ProductSerializer


class CartItemSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    product = ProductSerializer()
    quantity = serializers.IntegerField()


class AddCartItemSerializer(serializers.Serializer):
    product_id = serializers.CharField()
    quantity = serializers.IntegerField(min_value=1, default=1)


class OrderItemSerializer(serializers.Serializer):
    product = ProductSerializer()
    vendor = serializers.CharField()
    quantity = serializers.IntegerField()
    price = serializers.FloatField()
    subtotal = serializers.FloatField()


class OrderSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    user = serializers.CharField()
    status = serializers.CharField()
    total_amount = serializers.FloatField()
    items = OrderItemSerializer(many=True, required=False)
