from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Vendor
from .serializers import VendorSerializer

# Vendor registration
class VendorRegisterView(APIView):
    def post(self, request):
        serializer = VendorSerializer(data=request.data)
        if serializer.is_valid():
            vendor = serializer.save()
            return Response({"vendor_id": str(vendor.id)}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# List all vendors
class VendorListView(APIView):
    def get(self, request):
        vendors = Vendor.objects.all()
        data = [
            {"id": str(v.id), "store_name": v.store_name, "user": v.user.email}
            for v in vendors
        ]
        return Response(data)
