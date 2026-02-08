from rest_framework import serializers
from .models import Category, Product

class CategorySerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    name = serializers.CharField()
    slug = serializers.CharField()
    parent = serializers.CharField(allow_null=True, required=False)
    is_active = serializers.BooleanField()
    created_at = serializers.DateTimeField()

class ProductSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    name = serializers.CharField()
    slug = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    price = serializers.FloatField()
    stock = serializers.FloatField()
    category = serializers.CharField()
    vendor = serializers.CharField()
    is_active = serializers.BooleanField()
    created_at = serializers.DateTimeField()
