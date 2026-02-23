from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .services import (
    list_vendors,
    update_vendor_status,
    update_vendor_commission,
    platform_orders,
    calculate_revenue,
    get_active_commission_setting,
    update_global_commission,
    reporting_overview,  # ✅ ADD
)

from .models import CommissionLog

from .serializers import (
    VendorSerializer,
    VendorStatusUpdateSerializer,
    VendorCommissionSerializer,
    AdminOrderSerializer,
    CommissionSettingSerializer,
    UpdateCommissionSettingSerializer,
    CommissionLogSerializer,
)


class IsAdminRole(IsAuthenticated):
    """
    Requires authentication AND user.role == 'admin'
    """
    def has_permission(self, request, view):
        is_auth = super().has_permission(request, view)
        if not is_auth:
            return False
        return getattr(request.user, "role", None) == "admin"


# ---------------------------
# 7.1 Vendor Management
# ---------------------------

class VendorListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        vendor_status = request.query_params.get("status")   # pending/approved/suspended/rejected
        is_active = request.query_params.get("is_active")    # true/false
        search = request.query_params.get("search")          # store_name/email

        vendors = list_vendors(status=vendor_status, is_active=is_active, search=search)
        serializer = VendorSerializer(vendors, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class VendorStatusUpdateView(APIView):
    permission_classes = [IsAdminRole]

    def patch(self, request, vendor_id):
        serializer = VendorStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        vendor = update_vendor_status(
            vendor_id=vendor_id,
            new_status=serializer.validated_data["status"],
            is_active=serializer.validated_data.get("is_active"),
        )

        if not vendor:
            return Response({"error": "Vendor not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {"message": f"Vendor '{vendor.store_name}' status updated", "status": vendor.status},
            status=status.HTTP_200_OK,
        )


class VendorCommissionUpdateView(APIView):
    permission_classes = [IsAdminRole]

    def patch(self, request, vendor_id):
        serializer = VendorCommissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            vendor = update_vendor_commission(
                vendor_id=vendor_id,
                commission_rate=serializer.validated_data["commission_rate"],
                admin_user=request.user,
                note=request.data.get("note", ""),
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if not vendor:
            return Response({"error": "Vendor not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {
                "message": f"Vendor '{vendor.store_name}' commission updated",
                "commission_rate": str(vendor.commission_rate),
            },
            status=status.HTTP_200_OK,
        )


# ---------------------------
# 7.2 Global Commission + Logs
# ---------------------------

class GlobalCommissionView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        setting = get_active_commission_setting()
        return Response(CommissionSettingSerializer(setting).data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UpdateCommissionSettingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            setting = update_global_commission(
                admin_user=request.user,
                default_commission_rate=serializer.validated_data["default_commission_rate"],
                note=request.data.get("note", ""),
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(CommissionSettingSerializer(setting).data, status=status.HTTP_200_OK)


class CommissionLogsView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        logs = (
            CommissionLog.objects
            .select_related("admin_user", "vendor")
            .order_by("-created_at")[:200]
        )
        return Response(CommissionLogSerializer(logs, many=True).data, status=status.HTTP_200_OK)


# ---------------------------
# 7.3 Reporting Overview (NEW)
# ---------------------------

class ReportingOverviewView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        top_n = request.query_params.get("top_n")

        try:
            top_n = int(top_n) if top_n else 10
        except ValueError:
            top_n = 10

        data = reporting_overview(date_from=date_from, date_to=date_to, top_n=top_n)
        return Response(data, status=status.HTTP_200_OK)


# ---------------------------
# Orders + Revenue
# ---------------------------

class PlatformOrderListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        order_status = request.query_params.get("status")
        vendor_id = request.query_params.get("vendor_id")
        date_from = request.query_params.get("date_from")  # YYYY-MM-DD
        date_to = request.query_params.get("date_to")      # YYYY-MM-DD

        orders = platform_orders(status=order_status, vendor_id=vendor_id, date_from=date_from, date_to=date_to)
        serializer = AdminOrderSerializer(orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PlatformRevenueView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        date_from = request.query_params.get("date_from")  # YYYY-MM-DD
        date_to = request.query_params.get("date_to")      # YYYY-MM-DD

        revenue = calculate_revenue(date_from=date_from, date_to=date_to)
        return Response(revenue, status=status.HTTP_200_OK)


class AdminDashboardView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        data = {
            "total_users": 0,
            "total_vendors": 0,
            "total_orders": 0,
            "total_products": 0,
        }
        return Response(data, status=status.HTTP_200_OK)
