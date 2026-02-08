from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .services import (
    list_vendors, update_vendor_status, update_vendor_commission,
    platform_orders, calculate_revenue
)
from .serializers import VendorSerializer, VendorStatusUpdateSerializer, VendorCommissionSerializer, AdminOrderSerializer

# 1️⃣ List vendors
class VendorListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        vendors = list_vendors()
        serializer = VendorSerializer(vendors, many=True)
        return Response(serializer.data)

# 2️⃣ Update vendor status
class VendorStatusUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, vendor_id):
        serializer = VendorStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vendor = update_vendor_status(vendor_id, serializer.validated_data["status"])
        if vendor:
            return Response({"message": f"Vendor {vendor.store_name} status updated"})
        return Response({"error": "Vendor not found"}, status=404)

# 3️⃣ Update vendor commission
class VendorCommissionUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, vendor_id):
        serializer = VendorCommissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vendor = update_vendor_commission(vendor_id, serializer.validated_data["commission"])
        if vendor:
            return Response({"message": f"Vendor {vendor.store_name} commission updated"})
        return Response({"error": "Vendor not found"}, status=404)

# 4️⃣ Platform orders
class PlatformOrderListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        status = request.GET.get("status")
        orders = platform_orders(status)
        data = []
        for order in orders:
            data.append({
                "order_id": str(order.id),
                "user_id": str(order.user.id),
                "status": order.status,
                "total_amount": order.total_amount
            })
        return Response(data)

# 5️⃣ Platform revenue
class PlatformRevenueView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        revenue = calculate_revenue()
        return Response(revenue)


class AdminDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        data = {
            "total_users": 0,
            "total_vendors": 0,
            "total_orders": 0,
            "total_products": 0,
        }
        return Response(data)