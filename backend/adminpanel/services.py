from __future__ import annotations

from datetime import datetime, time
from decimal import Decimal
from typing import Optional

from django.db.models import Q, Sum, Count
from django.db.models.functions import TruncDate
from django.utils.dateparse import parse_date
from django.utils import timezone

from vendors.models import Vendor
from orders.models import Order, OrderItem
from .models import CommissionSetting, CommissionLog


# -----------------------------
# Helpers
# -----------------------------
def _aware_start_end(date_str: Optional[str], is_end: bool = False):
    """
    Convert YYYY-MM-DD string into an aware datetime at start/end of day in current timezone.
    Returns None if date_str invalid.
    """
    if not date_str:
        return None
    d = parse_date(date_str)
    if not d:
        return None
    tz = timezone.get_current_timezone()
    naive = datetime.combine(d, time.max if is_end else time.min)
    return timezone.make_aware(naive, tz)


# -----------------------------
# Commission (Global + Effective)
# -----------------------------
def get_active_commission_setting() -> CommissionSetting:
    """
    Returns the active global commission setting.
    Auto-creates a default record if none exists.
    """
    setting = CommissionSetting.objects.filter(is_active=True).order_by("-created_at").first()
    if not setting:
        setting = CommissionSetting.objects.create(
            default_commission_rate=Decimal("10.00"),
            is_active=True,
        )
    return setting


def update_global_commission(admin_user, default_commission_rate: Decimal, note: str = "") -> CommissionSetting:
    """
    Update the active global commission.
    Creates an audit log entry.
    """
    setting = get_active_commission_setting()
    old = Decimal(str(setting.default_commission_rate))

    new_rate = Decimal(str(default_commission_rate))
    if new_rate < 0 or new_rate > 100:
        raise ValueError("default_commission_rate must be between 0 and 100.")

    setting.default_commission_rate = new_rate
    setting.save(update_fields=["default_commission_rate", "updated_at"])

    CommissionLog.objects.create(
        action=CommissionLog.ACTION_GLOBAL_UPDATE,
        admin_user=admin_user,
        old_value=old,
        new_value=new_rate,
        note=note,
    )
    return setting


def get_effective_commission_rate(vendor: Vendor) -> Decimal:
    """
    Effective commission:
    - Use vendor commission_rate if set
    - Else use global default commission rate
    """
    if vendor.commission_rate is not None:
        return Decimal(str(vendor.commission_rate))
    setting = get_active_commission_setting()
    return Decimal(str(setting.default_commission_rate))


def _log_vendor_override(admin_user, vendor: Vendor, old: Optional[Decimal], new: Decimal, note: str = ""):
    CommissionLog.objects.create(
        action=CommissionLog.ACTION_VENDOR_OVERRIDE,
        admin_user=admin_user,
        vendor=vendor,
        old_value=old,
        new_value=new,
        note=note,
    )


# -----------------------------
# Vendors
# -----------------------------
def list_vendors(
    status: Optional[str] = None,
    is_active: Optional[str] = None,
    search: Optional[str] = None,
):
    qs = Vendor.objects.select_related("user").all()

    if status:
        qs = qs.filter(status=status)

    if is_active is not None:
        val = str(is_active).lower()
        if val in ["true", "1", "yes"]:
            qs = qs.filter(is_active=True)
        elif val in ["false", "0", "no"]:
            qs = qs.filter(is_active=False)

    if search:
        qs = qs.filter(Q(store_name__icontains=search) | Q(user__email__icontains=search))

    return qs.order_by("-created_at")


def update_vendor_status(vendor_id: int, new_status: str, is_active: Optional[bool] = None):
    try:
        vendor = Vendor.objects.get(pk=vendor_id)
    except Vendor.DoesNotExist:
        return None

    vendor.status = new_status
    if is_active is not None:
        vendor.is_active = bool(is_active)

    vendor.save(update_fields=["status", "is_active", "updated_at"])
    return vendor


def update_vendor_commission(
    vendor_id: int,
    commission_rate,
    admin_user=None,
    note: str = "",
):
    """
    Update vendor commission_rate (0-100).
    Logs vendor override when admin_user is provided.
    Returns Vendor or None.
    """
    try:
        vendor = Vendor.objects.get(pk=vendor_id)
    except Vendor.DoesNotExist:
        return None

    rate = Decimal(str(commission_rate))
    if rate < 0 or rate > 100:
        raise ValueError("commission_rate must be between 0 and 100.")

    old = Decimal(str(vendor.commission_rate)) if vendor.commission_rate is not None else None

    vendor.commission_rate = rate
    vendor.save(update_fields=["commission_rate", "updated_at"])

    if admin_user is not None:
        _log_vendor_override(admin_user, vendor, old, rate, note=note)

    return vendor


# -----------------------------
# Orders (Platform-wide)
# -----------------------------
def platform_orders(
    status: Optional[str] = None,
    vendor_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    qs = Order.objects.select_related("user").all()

    if status:
        qs = qs.filter(status=status)

    start_dt = _aware_start_end(date_from, is_end=False)
    end_dt = _aware_start_end(date_to, is_end=True)

    if start_dt:
        qs = qs.filter(created_at__gte=start_dt)
    if end_dt:
        qs = qs.filter(created_at__lte=end_dt)

    if vendor_id:
        try:
            vid = int(vendor_id)
            qs = qs.filter(items__vendor_id=vid).distinct()
        except (TypeError, ValueError):
            pass

    return qs.order_by("-created_at")


# -----------------------------
# Revenue Reporting (Basic)
# -----------------------------
def calculate_revenue(date_from: Optional[str] = None, date_to: Optional[str] = None):
    orders_qs = Order.objects.all()

    start_dt = _aware_start_end(date_from, is_end=False)
    end_dt = _aware_start_end(date_to, is_end=True)

    if start_dt:
        orders_qs = orders_qs.filter(created_at__gte=start_dt)
    if end_dt:
        orders_qs = orders_qs.filter(created_at__lte=end_dt)

    delivered_qs = orders_qs.filter(status=Order.STATUS_DELIVERED)
    paid_qs = orders_qs.filter(payment_status=Order.PAY_PAID)

    gross_qs = orders_qs.filter(status=Order.STATUS_DELIVERED, payment_status=Order.PAY_PAID)
    gross_sales = gross_qs.aggregate(total=Sum("total_amount"))["total"] or 0

    items_qs = OrderItem.objects.select_related("vendor", "order").filter(
        order__status=Order.STATUS_DELIVERED,
        order__payment_status=Order.PAY_PAID,
    )

    if start_dt:
        items_qs = items_qs.filter(order__created_at__gte=start_dt)
    if end_dt:
        items_qs = items_qs.filter(order__created_at__lte=end_dt)

    commission_total = Decimal("0.00")
    vendor_payout_total = Decimal("0.00")

    for item in items_qs:
        line_total = Decimal(str(item.line_total))
        rate = get_effective_commission_rate(item.vendor)
        commission = (line_total * rate) / Decimal("100")
        payout = line_total - commission

        commission_total += commission
        vendor_payout_total += payout

    return {
        "filters": {"date_from": date_from, "date_to": date_to},
        "gross_sales": float(gross_sales),
        "delivered_orders": delivered_qs.count(),
        "paid_orders": paid_qs.count(),
        "commission_total_estimate": float(commission_total),
        "vendor_payout_total_estimate": float(vendor_payout_total),
        "global_default_commission_rate": str(get_active_commission_setting().default_commission_rate),
    }


# -----------------------------
# Phase 7.3 Reporting Overview (NEW)
# -----------------------------
def reporting_overview(date_from: Optional[str] = None, date_to: Optional[str] = None, top_n: int = 10):
    start_dt = _aware_start_end(date_from, is_end=False)
    end_dt = _aware_start_end(date_to, is_end=True)

    orders_qs = Order.objects.all()
    if start_dt:
        orders_qs = orders_qs.filter(created_at__gte=start_dt)
    if end_dt:
        orders_qs = orders_qs.filter(created_at__lte=end_dt)

    orders_by_status = dict(
        orders_qs.values("status").annotate(count=Count("id")).values_list("status", "count")
    )
    payments_by_status = dict(
        orders_qs.values("payment_status").annotate(count=Count("id")).values_list("payment_status", "count")
    )

    gross_qs = orders_qs.filter(status=Order.STATUS_DELIVERED, payment_status=Order.PAY_PAID)
    gross_sales = gross_qs.aggregate(total=Sum("total_amount"))["total"] or 0

    items_qs = OrderItem.objects.select_related("vendor", "catalog_product", "order").filter(
        order__status=Order.STATUS_DELIVERED,
        order__payment_status=Order.PAY_PAID,
    )
    if start_dt:
        items_qs = items_qs.filter(order__created_at__gte=start_dt)
    if end_dt:
        items_qs = items_qs.filter(order__created_at__lte=end_dt)

    commission_total = Decimal("0.00")
    vendor_payout_total = Decimal("0.00")

    for item in items_qs:
        line_total = Decimal(str(item.line_total))
        rate = get_effective_commission_rate(item.vendor)
        commission = (line_total * rate) / Decimal("100")
        payout = line_total - commission
        commission_total += commission
        vendor_payout_total += payout

    top_vendors_qs = (
        items_qs.values("vendor_id", "vendor__store_name")
        .annotate(sales=Sum("line_total"), items=Sum("quantity"))
        .order_by("-sales")[:top_n]
    )
    top_vendors = [
        {
            "vendor_id": r["vendor_id"],
            "store_name": r["vendor__store_name"],
            "sales": float(r["sales"] or 0),
            "items_sold": int(r["items"] or 0),
        }
        for r in top_vendors_qs
    ]

    top_products_qs = (
        items_qs.values("catalog_product_id", "catalog_product__name")
        .annotate(sales=Sum("line_total"), qty=Sum("quantity"))
        .order_by("-sales")[:top_n]
    )
    top_products = [
        {
            "product_id": r["catalog_product_id"],
            "name": r["catalog_product__name"],
            "sales": float(r["sales"] or 0),
            "quantity": int(r["qty"] or 0),
        }
        for r in top_products_qs
    ]

    daily_sales_qs = (
        gross_qs.annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(total=Sum("total_amount"), orders=Count("id"))
        .order_by("day")
    )
    daily_sales = [
        {"day": str(r["day"]), "total": float(r["total"] or 0), "orders": int(r["orders"] or 0)}
        for r in daily_sales_qs
    ]

    return {
        "filters": {"date_from": date_from, "date_to": date_to},
        "gross_sales": float(gross_sales),
        "commission_total": float(commission_total),
        "vendor_payout_total": float(vendor_payout_total),
        "orders_by_status": orders_by_status,
        "payments_by_status": payments_by_status,
        "top_vendors": top_vendors,
        "top_products": top_products,
        "daily_sales": daily_sales,
        "global_default_commission_rate": str(get_active_commission_setting().default_commission_rate),
    }
