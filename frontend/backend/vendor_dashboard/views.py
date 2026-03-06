from datetime import timedelta

from django.db.models import Sum, Count
from django.db.models.functions import TruncDate
from django.utils import timezone

from rest_framework import viewsets, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action

from vendors.permissions import IsVendor
from vendors.models import Vendor, VendorPayout
from products.models import Offer
from orders.models import Order, OrderItem

from .serializers import (
    VendorOfferSerializer,
    VendorProductSerializer,
    VendorOrderSerializer,
    VendorPayoutSerializer,
)


# -------------------------
# Shared helper
# -------------------------
def get_vendor_for_user(user):
    return Vendor.objects.filter(user_id=user.id).order_by("id").first()


def parse_range_days(value: str) -> int:
    v = (value or "").strip().lower()
    if v in {"7", "7d"}:
        return 7
    if v in {"30", "30d"}:
        return 30
    if v in {"90", "90d"}:
        return 90
    return 30


# =========================
# PHASE 6 - STEP 1: OFFERS
# =========================
class VendorOfferViewSet(viewsets.ModelViewSet):
    serializer_class = VendorOfferSerializer
    permission_classes = [IsAuthenticated, IsVendor]

    def get_vendor(self):
        vendor = get_vendor_for_user(self.request.user)
        if not vendor:
            raise PermissionDenied("Vendor profile not found.")
        return vendor

    def get_queryset(self):
        vendor = self.get_vendor()
        return Offer.objects.filter(vendor=vendor, is_active=True).order_by("-id")

    def perform_create(self, serializer):
        vendor = self.get_vendor()
        serializer.save(vendor=vendor, is_active=True)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])


# =========================
# PRODUCTS (Vendor Dashboard)
# Endpoint: /api/vendor/products/
# =========================
class VendorProductViewSet(viewsets.ModelViewSet):
    serializer_class = VendorProductSerializer
    permission_classes = [IsAuthenticated, IsVendor]

    def get_vendor(self):
        vendor = get_vendor_for_user(self.request.user)
        if not vendor:
            raise PermissionDenied("Vendor profile not found.")
        return vendor

    def get_queryset(self):
        vendor = self.get_vendor()

        qs = (
            Offer.objects
            .filter(vendor=vendor)
            .select_related("catalog_product", "catalog_product__category", "vendor")
            .order_by("-id")
        )

        status_param = self.request.query_params.get("status")
        if status_param == "active":
            qs = qs.filter(is_active=True)
        elif status_param == "hidden":
            qs = qs.filter(is_active=False)

        return qs

    def perform_create(self, serializer):
        vendor = self.get_vendor()
        serializer.save(vendor=vendor, is_active=True)

    def perform_update(self, serializer):
        vendor = self.get_vendor()
        serializer.save(vendor=vendor)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])

    @action(detail=True, methods=["patch"])
    def unhide(self, request, pk=None):
        offer = self.get_queryset().filter(pk=pk).first()
        if not offer:
            return Response({"detail": "Product not found"}, status=404)

        offer.is_active = True
        offer.save(update_fields=["is_active"])
        return Response({"detail": "Product unhidden"})


# =========================
# PHASE 6 - STEP 2: ORDERS
# =========================
class VendorOrderListView(generics.ListAPIView):
    serializer_class = VendorOrderSerializer
    permission_classes = [IsAuthenticated, IsVendor]

    def get_vendor(self):
        vendor = get_vendor_for_user(self.request.user)
        if not vendor:
            raise PermissionDenied("Vendor profile not found.")
        return vendor

    def get_queryset(self):
        vendor = self.get_vendor()
        return Order.objects.filter(items__vendor=vendor).distinct().order_by("-created_at")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["vendor"] = self.get_vendor()
        return ctx


class VendorOrderDetailView(generics.RetrieveAPIView):
    serializer_class = VendorOrderSerializer
    permission_classes = [IsAuthenticated, IsVendor]
    lookup_url_kwarg = "order_id"

    def get_vendor(self):
        vendor = get_vendor_for_user(self.request.user)
        if not vendor:
            raise PermissionDenied("Vendor profile not found.")
        return vendor

    def get_queryset(self):
        vendor = self.get_vendor()
        return Order.objects.filter(items__vendor=vendor).distinct()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["vendor"] = self.get_vendor()
        return ctx


# =========================
# PHASE 6 - STEP 3: EARNINGS
# =========================
class VendorEarningsSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsVendor]

    def get(self, request):
        vendor = get_vendor_for_user(request.user)
        if not vendor:
            raise PermissionDenied("Vendor profile not found.")

        qs = VendorPayout.objects.filter(vendor=vendor)

        totals = qs.aggregate(
            gross_total=Sum("gross_amount"),
            commission_total=Sum("commission_amount"),
            net_total=Sum("net_amount"),
        )

        # ✅ use actual choice values (no constants needed)
        pending_total = qs.filter(status="pending").aggregate(total=Sum("net_amount"))["total"] or 0.0
        paid_total = qs.filter(status="paid").aggregate(total=Sum("net_amount"))["total"] or 0.0
        cancelled_total = qs.filter(status="cancelled").aggregate(total=Sum("net_amount"))["total"] or 0.0

        last_30 = timezone.now() - timedelta(days=30)
        last_30_net = qs.filter(created_at__gte=last_30).aggregate(total=Sum("net_amount"))["total"] or 0.0

        return Response({
            "gross_total": float(totals["gross_total"] or 0.0),
            "commission_total": float(totals["commission_total"] or 0.0),
            "net_total": float(totals["net_total"] or 0.0),
            "pending_net_total": float(pending_total),
            "paid_net_total": float(paid_total),
            "cancelled_net_total": float(cancelled_total),
            "last_30_days_net_total": float(last_30_net),
        })


class VendorPayoutListView(generics.ListAPIView):
    serializer_class = VendorPayoutSerializer
    permission_classes = [IsAuthenticated, IsVendor]

    def get_queryset(self):
        vendor = get_vendor_for_user(self.request.user)
        if not vendor:
            raise PermissionDenied("Vendor profile not found.")

        return VendorPayout.objects.filter(vendor=vendor).select_related("order").order_by("-created_at")


# =========================
# PHASE 6 - STEP 4: ANALYTICS
# =========================
class VendorAnalyticsOverviewView(APIView):
    permission_classes = [IsAuthenticated, IsVendor]

    def get(self, request):
        vendor = get_vendor_for_user(request.user)
        if not vendor:
            raise PermissionDenied("Vendor profile not found.")

        days = parse_range_days(request.query_params.get("range", "30d"))
        start_dt = timezone.now() - timedelta(days=days)

        items_qs = OrderItem.objects.filter(
            vendor=vendor,
            order__created_at__gte=start_dt
        )

        revenue = items_qs.aggregate(total=Sum("line_total"))["total"] or 0.0
        items_sold = items_qs.aggregate(total=Sum("quantity"))["total"] or 0
        orders_count = items_qs.values("order_id").distinct().count()

        avg_order_value = 0.0
        if orders_count > 0:
            avg_order_value = float(revenue) / float(orders_count)

        return Response({
            "revenue": float(revenue),
            "orders_count": int(orders_count),
            "items_sold": int(items_sold),
            "avg_order_value": float(avg_order_value),
        })


class VendorAnalyticsTopProductsView(APIView):
    permission_classes = [IsAuthenticated, IsVendor]

    def get(self, request):
        vendor = get_vendor_for_user(request.user)
        if not vendor:
            raise PermissionDenied("Vendor profile not found.")

        days = parse_range_days(request.query_params.get("range", "30d"))
        start_dt = timezone.now() - timedelta(days=days)

        qs = (
            OrderItem.objects
            .filter(vendor=vendor, order__created_at__gte=start_dt)
            .values("catalog_product_id", "catalog_product__name")
            .annotate(
                revenue=Sum("line_total"),
                qty=Sum("quantity"),
                orders=Count("order_id", distinct=True),
            )
            .order_by("-revenue")[:5]
        )

        return Response([
            {
                "catalog_product_id": row["catalog_product_id"],
                "name": row["catalog_product__name"],
                "revenue": float(row["revenue"] or 0.0),
                "quantity": int(row["qty"] or 0),
                "orders": int(row["orders"] or 0),
            }
            for row in qs
        ])


class VendorAnalyticsDailySalesView(APIView):
    permission_classes = [IsAuthenticated, IsVendor]

    def get(self, request):
        vendor = get_vendor_for_user(request.user)
        if not vendor:
            raise PermissionDenied("Vendor profile not found.")

        days = parse_range_days(request.query_params.get("range", "30d"))
        start_dt = timezone.now() - timedelta(days=days)

        qs = (
            OrderItem.objects
            .filter(vendor=vendor, order__created_at__gte=start_dt)
            .annotate(day=TruncDate("order__created_at"))
            .values("day")
            .annotate(revenue=Sum("line_total"))
            .order_by("day")
        )

        return Response([
            {"date": row["day"], "revenue": float(row["revenue"] or 0.0)}
            for row in qs
        ])