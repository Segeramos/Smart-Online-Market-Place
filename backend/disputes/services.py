from django.utils import timezone
from orders.models import Order, OrderItem
from vendors.models import Vendor
from .models import Dispute, DisputeMessage


def _is_admin(user) -> bool:
    return getattr(user, "role", None) == "admin"


def _is_vendor(user) -> bool:
    return getattr(user, "role", None) == "vendor"


def create_dispute(user, order_id: int, subject: str, description: str, vendor_id=None):
    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        return None, "Order not found"

    if not _is_admin(user) and order.user_id != user.id:
        return None, "You can only open disputes for your own orders"

    vendor = None
    if vendor_id:
        try:
            vendor = Vendor.objects.get(pk=vendor_id)
        except Vendor.DoesNotExist:
            return None, "Vendor not found"

        if not OrderItem.objects.filter(order_id=order_id, vendor_id=vendor_id).exists():
            return None, "That vendor is not part of this order"

    dispute = Dispute.objects.create(
        created_by=user,
        order=order,
        vendor=vendor,
        subject=subject,
        description=description,
        status=Dispute.STATUS_OPEN,
    )

    DisputeMessage.objects.create(
        dispute=dispute,
        sender=user,
        message=f"Dispute opened: {description}",
    )

    return dispute, None


def list_disputes_for_user(user, status=None):
    qs = Dispute.objects.select_related("created_by", "order", "vendor", "assigned_admin").all()

    if _is_admin(user):
        pass
    elif _is_vendor(user):
        qs = qs.filter(vendor__user_id=user.id)
    else:
        qs = qs.filter(created_by_id=user.id)

    if status:
        qs = qs.filter(status=status)

    return qs.order_by("-created_at")


def get_dispute_for_user(user, dispute_id: int):
    qs = Dispute.objects.select_related("created_by", "order", "vendor", "assigned_admin").all()
    try:
        dispute = qs.get(pk=dispute_id)
    except Dispute.DoesNotExist:
        return None

    if _is_admin(user):
        return dispute
    if _is_vendor(user):
        return dispute if (dispute.vendor and dispute.vendor.user_id == user.id) else None
    return dispute if dispute.created_by_id == user.id else None


def add_message(user, dispute: Dispute, message: str):
    if not _is_admin(user):
        is_creator = dispute.created_by_id == user.id
        is_vendor = dispute.vendor and dispute.vendor.user_id == user.id
        if not (is_creator or is_vendor):
            return None, "Not allowed"

    msg = DisputeMessage.objects.create(dispute=dispute, sender=user, message=message)
    dispute.updated_at = timezone.now()
    dispute.save(update_fields=["updated_at"])
    return msg, None


def resolve_dispute(admin_user, dispute: Dispute, status_value: str, resolution_type: str = "", resolution_note: str = ""):
    if not _is_admin(admin_user):
        return "Admin only"

    allowed = {Dispute.STATUS_RESOLVED, Dispute.STATUS_REJECTED, Dispute.STATUS_CLOSED, Dispute.STATUS_IN_REVIEW}
    if status_value not in allowed:
        return "Invalid status transition"

    dispute.status = status_value
    dispute.assigned_admin = admin_user

    if status_value in {Dispute.STATUS_RESOLVED, Dispute.STATUS_REJECTED, Dispute.STATUS_CLOSED}:
        dispute.resolution_type = resolution_type or dispute.resolution_type
        dispute.resolution_note = resolution_note or dispute.resolution_note
        dispute.resolved_at = timezone.now()

    dispute.save()
    return None
