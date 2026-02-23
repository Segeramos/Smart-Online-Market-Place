# vendor_dashboard/serializers.py

from rest_framework import serializers
from django.db.models import Sum

from products.models import Offer, CatalogProduct
from orders.models import Order, OrderItem
from vendors.models import VendorPayout


# =========================
# PHASE 6 - STEP 1: OFFERS
# =========================
class VendorOfferSerializer(serializers.ModelSerializer):
    catalog_product_name = serializers.CharField(source="catalog_product.name", read_only=True)
    category_name = serializers.CharField(source="catalog_product.category.name", read_only=True)

    class Meta:
        model = Offer
        fields = [
            "id",
            "catalog_product",
            "catalog_product_name",
            "category_name",
            "price",
            "stock",
            "is_active",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "is_active",
            "created_at",
            "catalog_product_name",
            "category_name",
        ]

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock cannot be negative.")
        return value


# =========================
# ✅ Vendor Products Serializer
# Used by: /api/vendor/products/
# =========================
class VendorProductSerializer(serializers.ModelSerializer):

    # READ fields from CatalogProduct
    name = serializers.CharField(source="catalog_product.name", read_only=True)
    slug = serializers.SlugField(source="catalog_product.slug", read_only=True)
    category_name = serializers.CharField(source="catalog_product.category.name", read_only=True)

    # WRITE: vendor selects which catalog product to list
    catalog_product = serializers.PrimaryKeyRelatedField(
        queryset=CatalogProduct.objects.filter(is_active=True)
    )

    class Meta:
        model = Offer
        fields = [
            "id",
            "catalog_product",
            "name",
            "slug",
            "category_name",
            "price",
            "stock",
            "is_active",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "name",
            "slug",
            "category_name",
        ]

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock cannot be negative.")
        return value


# =========================
# PHASE 6 - STEP 2: ORDERS
# =========================
class VendorOrderItemSerializer(serializers.ModelSerializer):
    catalog_product_name = serializers.CharField(source="catalog_product.name", read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "offer",
            "catalog_product",
            "catalog_product_name",
            "unit_price",
            "quantity",
            "line_total",
        ]


class VendorOrderSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    vendor_total = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "payment_status",
            "payment_method",
            "paid_at",
            "created_at",

            "delivery_full_name",
            "delivery_phone",
            "delivery_county",
            "delivery_city",
            "delivery_area",
            "delivery_street",
            "delivery_building",
            "delivery_house_no",
            "delivery_notes",

            "vendor_total",
            "items",
        ]

    def _get_vendor(self):
        return self.context.get("vendor")

    def get_items(self, obj):
        vendor = self._get_vendor()
        qs = obj.items.filter(vendor=vendor).select_related("catalog_product", "offer")
        return VendorOrderItemSerializer(qs, many=True).data

    def get_vendor_total(self, obj):
        vendor = self._get_vendor()
        agg = obj.items.filter(vendor=vendor).aggregate(total=Sum("line_total"))
        return float(agg["total"] or 0.0)


# =========================
# PHASE 6 - STEP 3: EARNINGS
# =========================
class VendorPayoutSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source="order.id", read_only=True)
    order_status = serializers.CharField(source="order.status", read_only=True)
    order_payment_status = serializers.CharField(source="order.payment_status", read_only=True)
    order_created_at = serializers.DateTimeField(source="order.created_at", read_only=True)

    class Meta:
        model = VendorPayout
        fields = [
            "id",
            "order_id",
            "order_status",
            "order_payment_status",
            "order_created_at",
            "gross_amount",
            "commission_amount",
            "net_amount",
            "status",
            "created_at",
            "paid_at",
        ]