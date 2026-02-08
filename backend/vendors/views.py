# backend/vendorpanel/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services import (
    create_vendor,
    list_vendors,
    get_vendor,
    update_vendor,
    deactivate_vendor,
)

# Register a new vendor
class VendorRegisterView(APIView):
    def post(self, request):
        user_id = request.data.get('user_id')
        store_name = request.data.get('store_name')
        description = request.data.get('description', '')
        commission_rate = float(request.data.get('commission_rate', 0.0))

        vendor = create_vendor(user_id, store_name, description, commission_rate)

        return Response(
            {
                "id": str(vendor.id),
                "store_name": vendor.store_name,
                "user_email": vendor.user.email,
            },
            status=status.HTTP_201_CREATED,
        )


# List all vendors
class VendorListView(APIView):
    def get(self, request):
        vendors = list_vendors()
        data = [
            {
                "id": str(v.id),
                "store_name": v.store_name,
                "user_email": v.user.email,
                "is_active": v.is_active,
            }
            for v in vendors
        ]

        return Response(data, status=status.HTTP_200_OK)


# Retrieve / update / deactivate a vendor
class VendorDetailView(APIView):
    def get(self, request, vendor_id):
        vendor = get_vendor(vendor_id)
        if not vendor:
            return Response(
                {"error": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "id": str(vendor.id),
                "store_name": vendor.store_name,
                "user_email": vendor.user.email,
                "is_active": vendor.is_active,
            }
        )

    def put(self, request, vendor_id):
        vendor = update_vendor(vendor_id, **request.data)
        if not vendor:
            return Response(
                {"error": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "id": str(vendor.id),
                "store_name": vendor.store_name,
                "user_email": vendor.user.email,
                "is_active": vendor.is_active,
            }
        )

    def delete(self, request, vendor_id):
        vendor = deactivate_vendor(vendor_id)
        if not vendor:
            return Response(
                {"error": "Vendor not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {"message": "Vendor deactivated"},
            status=status.HTTP_200_OK,
        )
