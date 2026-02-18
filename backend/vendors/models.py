from django.db import models
from django.utils import timezone


class Vendor(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        SUSPENDED = "suspended", "Suspended"
        REJECTED = "rejected", "Rejected"

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="vendors"
    )

    store_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    # Commission in %
    commission_rate = models.FloatField(default=10.0)

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vendors"

    def __str__(self):
        return f"{self.store_name} ({self.user.email})"

    @property
    def is_approved(self):
        return self.status == self.Status.APPROVED and self.is_active


# 🔥 NEW MODEL (VERY IMPORTANT)
class VendorPayout(models.Model):

    STATUS_PENDING = "pending"
    STATUS_PAID = "paid"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PAID, "Paid"),
    ]

    vendor = models.ForeignKey(
        "vendors.Vendor",
        on_delete=models.CASCADE,
        related_name="payouts"
    )

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="vendor_payouts"
    )

    gross_amount = models.FloatField()
    commission_amount = models.FloatField()
    net_amount = models.FloatField()

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )

    created_at = models.DateTimeField(default=timezone.now)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "vendor_payouts"
        indexes = [
            models.Index(fields=["vendor"]),
            models.Index(fields=["order"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"Payout Vendor {self.vendor_id} - Order {self.order_id}"
