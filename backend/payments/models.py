# payments/models.py
from decimal import Decimal
from django.db import models
from django.utils import timezone


class Payment(models.Model):
    PROVIDER_MPESA = "mpesa"
    PROVIDER_CHOICES = [(PROVIDER_MPESA, "M-Pesa")]

    STATUS_INITIATED = "initiated"
    STATUS_PENDING = "pending"
    STATUS_PAID = "paid"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_INITIATED, "Initiated"),
        (STATUS_PENDING, "Pending"),
        (STATUS_PAID, "Paid"),
        (STATUS_FAILED, "Failed"),
    ]

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="payments",
        db_index=True,
    )
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="payments",
        db_index=True,
    )

    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default=PROVIDER_MPESA, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_INITIATED, db_index=True)

    # ✅ Use Decimal for money
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    currency = models.CharField(max_length=10, default="KES")
    phone_number = models.CharField(max_length=20, blank=True, default="")

    # Helpful references (useful in STK Push)
    account_reference = models.CharField(max_length=50, blank=True, default="")
    transaction_desc = models.CharField(max_length=100, blank=True, default="")

    # STK push identifiers
    checkout_request_id = models.CharField(max_length=100, blank=True, default="", db_index=True)
    merchant_request_id = models.CharField(max_length=100, blank=True, default="", db_index=True)

    # Receipt arrives on success callback
    mpesa_receipt = models.CharField(max_length=100, blank=True, default="", db_index=True)

    result_code = models.CharField(max_length=20, blank=True, default="")
    result_desc = models.CharField(max_length=255, blank=True, default="")

    raw_callback = models.JSONField(null=True, blank=True)

    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["order"]),
            models.Index(fields=["user"]),
            models.Index(fields=["provider"]),
            models.Index(fields=["status"]),
            models.Index(fields=["checkout_request_id"]),
            models.Index(fields=["merchant_request_id"]),
            models.Index(fields=["mpesa_receipt"]),
        ]

    def mark_paid(self, receipt: str = ""):
        self.status = self.STATUS_PAID
        if receipt:
            self.mpesa_receipt = receipt
        self.paid_at = timezone.now()
        self.save(update_fields=["status", "mpesa_receipt", "paid_at", "updated_at"])

    def mark_failed(self, code: str = "", desc: str = ""):
        self.status = self.STATUS_FAILED
        self.result_code = str(code or "")
        self.result_desc = str(desc or "")
        self.save(update_fields=["status", "result_code", "result_desc", "updated_at"])

    def __str__(self):
        return f"Payment #{self.pk} - Order #{self.order_id} - {self.provider} - {self.status}"
