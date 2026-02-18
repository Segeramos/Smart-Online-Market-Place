# backend/vendorpanel/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsAdmin  # create this if you don't have it yet
from vendors.models import Vendor


# Helper: format vendor response
def vendor_to_dict(v: Vendor):
    return {
        "id": str(v.id),
        "store_name": v.store_name,
        "user_email": v.user.email,
        "status": getattr(v, "status", None),
        "is_active": v.is_active,
        "created_at": v.created_at,
        "updated_at": v.updated_at,
    }


# Vendor applies (NO user_id from client; use request.user)
# Creates vendor profile as PENDING
class VendorApplyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        store_name = request.data.get("store_name")
        if not store_name:
            return Response({"error": "store_name is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Optional fields
        description = request.data.get("description", "")
        commission_rate = request.data.get("commission_rate", 0.0)
        try:
            commission_rate = float(commission_rate)
        except (TypeError, ValueError):
            return Response({"error": "commission_rate must be a number"}, status=status.HTTP_400_BAD_REQUEST)

        # Block duplicate vendor applications for the same user
        existing = Vendor.objects.filter(user=request.user).order_by("-created_at").first()
        if existing:
            return Response(
                {
                    "error": "You already have a vendor profile/application.",
                    "vendor_id": str(existing.id),
                    "status": getattr(existing, "status", None),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Requires you to add Vendor.status with choices including 'pending' (as discussed)
        vendor = Vendor.objects.create(
            user=request.user,
            store_name=store_name,
            description=description,
            commission_rate=commission_rate,
            status=Vendor.Status.PENDING,
            is_active=True,
        )

        return Response(
            {"message": "Application submitted", **vendor_to_dict(vendor)},
            status=status.HTTP_201_CREATED,
        )


# Admin: list all vendors (optionally filter by status)
class VendorListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = Vendor.objects.select_related("user").all().order_by("-created_at")

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        data = [vendor_to_dict(v) for v in qs]
        return Response(data, status=status.HTTP_200_OK)


# Admin: retrieve/update vendor + set status (approve/suspend/reject) + deactivate
class VendorDetailView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, vendor_id):
        vendor = Vendor.objects.select_related("user").filter(id=vendor_id).first()
        if not vendor:
            return Response({"error": "Vendor not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(vendor_to_dict(vendor), status=status.HTTP_200_OK)

    def put(self, request, vendor_id):
        vendor = Vendor.objects.select_related("user").filter(id=vendor_id).first()
        if not vendor:
            return Response({"error": "Vendor not found"}, status=status.HTTP_404_NOT_FOUND)

        # Allow updating basic fields
        if "store_name" in request.data:
            vendor.store_name = request.data.get("store_name") or vendor.store_name
        if "description" in request.data:
            vendor.description = request.data.get("description", vendor.description)
        if "commission_rate" in request.data:
            try:
                vendor.commission_rate = float(request.data.get("commission_rate"))
            except (TypeError, ValueError):
                return Response({"error": "commission_rate must be a number"}, status=status.HTTP_400_BAD_REQUEST)

        # Admin can change status
        if "status" in request.data:
            new_status = request.data.get("status")
            if new_status not in Vendor.Status.values:
                return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

            vendor.status = new_status

            # Optional: promote user role to vendor ONLY when approved
            if new_status == Vendor.Status.APPROVED:
                vendor.user.role = "vendor"
                vendor.user.save(update_fields=["role"])

        vendor.save()
        return Response(vendor_to_dict(vendor), status=status.HTTP_200_OK)

    def delete(self, request, vendor_id):
        vendor = Vendor.objects.filter(id=vendor_id).first()
        if not vendor:
            return Response({"error": "Vendor not found"}, status=status.HTTP_404_NOT_FOUND)

        # Deactivate store without deleting record
        vendor.is_active = False
        # If you want suspension to reflect here too:
        vendor.status = Vendor.Status.SUSPENDED
        vendor.save(update_fields=["is_active", "status", "updated_at"])

        return Response({"message": "Vendor deactivated"}, status=status.HTTP_200_OK)
