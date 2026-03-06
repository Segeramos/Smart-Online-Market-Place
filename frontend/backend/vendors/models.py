from django.db import models
from django.utils import timezone
from decimal import Decimal


class Vendor(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        SUSPENDED = "suspended", "Suspended"
        REJECTED = "rejected", "Rejected"

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="vendors",  # OK if you allow a user to create multiple vendor stores
    )

    store_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    # Commission in % (0 - 100)
    # NOTE: In Phase 7.2 we’ll add a GLOBAL commission setting and allow this to be an override.
    commission_rate = models.DecimalField(
        max_digits=5,  # e.g. 100.00
        decimal_places=2,
        default=Decimal("10.00"),
        help_text="Commission percentage charged to vendor (0-100).",
    )

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    # is_active is useful for soft-disable (even if approved)
    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vendors"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        email = getattr(self.user, "email", "unknown-email")
        return f"{self.store_name} ({email})"

    @property
    def is_approved(self) -> bool:
        # Approved + active + not suspended
        return (
            self.status == self.Status.APPROVED
            and self.is_active
            and self.status != self.Status.SUSPENDED
        )

    @property
    def is_blocked(self) -> bool:
        # Used later to prevent actions for suspended/rejected vendors
        return (not self.is_active) or (self.status in [self.Status.SUSPENDED, self.Status.REJECTED])


class VendorPayout(models.Model):
    """
    Represents how much the vendor should receive for a given order.
    This is essential for Admin Reporting + Vendor Payouts.

    In Phase 7.3 we’ll generate these automatically when an order is paid/delivered
    depending on your business rules.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        CANCELLED = "cancelled", "Cancelled"

    vendor = models.ForeignKey(
        "vendors.Vendor",
        on_delete=models.CASCADE,
        related_name="payouts",
    )

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="vendor_payouts",
    )

    # Money fields should be DecimalField (NOT FloatField)
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2)

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "vendor_payouts"
        indexes = [
            models.Index(fields=["vendor"]),
            models.Index(fields=["order"]),
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]
        # Prevent duplicate payout rows for the same vendor+order
        constraints = [
            models.UniqueConstraint(fields=["vendor", "order"], name="unique_vendor_order_payout")
        ]

    def __str__(self):
        return f"Payout Vendor {self.vendor_id} - Order {self.order_id} ({self.status})"
