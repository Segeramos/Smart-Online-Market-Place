from vendors.models import Vendor
from orders.models import Order, OrderItem

def list_vendors():
    return Vendor.objects()

def update_vendor_status(vendor_id, status):
    vendor = Vendor.objects(id=vendor_id).first()
    if vendor:
        vendor.status = status
        vendor.save()
    return vendor

def update_vendor_commission(vendor_id, commission):
    vendor = Vendor.objects(id=vendor_id).first()
    if vendor:
        vendor.commission = commission
        vendor.save()
    return vendor

def platform_orders(status=None):
    orders = Order.objects()
    if status:
        orders = [o for o in orders if o.status == status]
    return orders

def calculate_revenue():
    orders = Order.objects(status="delivered")
    total_revenue = sum(o.total_amount for o in orders)
    return {"total_revenue": total_revenue, "total_orders": len(orders)}
