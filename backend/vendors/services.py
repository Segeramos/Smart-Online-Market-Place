# backend/vendors/services.py

from .models import Vendor
from accounts.models import User
import datetime

# Create a new vendor
def create_vendor(user_id, store_name, description='', commission_rate=0.0):
    user = User.objects.get(id=user_id)
    vendor = Vendor(
        user=user,
        store_name=store_name,
        description=description,
        commission_rate=commission_rate,
        is_active=True,
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow()
    )
    vendor.save()
    return vendor

# List all active vendors
def list_vendors():
    return Vendor.objects(is_active=True)

# Get vendor by ID
def get_vendor(vendor_id):
    return Vendor.objects(id=vendor_id).first()

# Update vendor details
def update_vendor(vendor_id, **kwargs):
    vendor = Vendor.objects(id=vendor_id).first()
    if not vendor:
        return None
    for key, value in kwargs.items():
        if hasattr(vendor, key):
            setattr(vendor, key, value)
    vendor.updated_at = datetime.datetime.utcnow()
    vendor.save()
    return vendor

# Deactivate a vendor
def deactivate_vendor(vendor_id):
    vendor = Vendor.objects(id=vendor_id).first()
    if not vendor:
        return None
    vendor.is_active = False
    vendor.updated_at = datetime.datetime.utcnow()
    vendor.save()
    return vendor
