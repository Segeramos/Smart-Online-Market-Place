from rest_framework import serializers
from .models import Category, CatalogProduct, Offer


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "is_active", "created_at"]


class OfferSerializer(serializers.ModelSerializer):
    vendor = serializers.CharField(source="vendor.store_name", read_only=True)

    class Meta:
        model = Offer
        fields = ["id", "vendor", "price", "stock", "is_active", "created_at"]


class CatalogProductSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", read_only=True)
    offers = OfferSerializer(many=True, read_only=True)

    class Meta:
        model = CatalogProduct
        fields = ["id", "name", "slug", "description", "category", "is_active", "created_at", "offers"]
