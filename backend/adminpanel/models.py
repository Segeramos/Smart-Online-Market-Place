from decimal import Decimal
from django.db import models
from django.utils import timezone


class CommissionSetting(models.Model):
    """
    Global commission configuration for the entire platform.
    Keep ONE active row (latest).
    """
    default_commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("10.00"),
    )
    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "commission_settings"
        indexes = [
            models.Index(fields=["is_active"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Global Commission {self.default_commission_rate}% (active={self.is_active})"


class CommissionLog(models.Model):
    """
    Audit log: who changed commission settings / vendor overrides.
    """
    ACTION_GLOBAL_UPDATE = "global_update"
    ACTION_VENDOR_OVERRIDE = "vendor_override"

    ACTION_CHOICES = [
        (ACTION_GLOBAL_UPDATE, "Global Update"),
        (ACTION_VENDOR_OVERRIDE, "Vendor Override"),
    ]

    action = models.CharField(max_length=30, choices=ACTION_CHOICES, db_index=True)
    admin_user = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="commission_logs",
    )

    vendor = models.ForeignKey(
        "vendors.Vendor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="commission_logs",
    )

    old_value = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    new_value = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "commission_logs"
        indexes = [
            models.Index(fields=["action"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.action} ({self.old_value} -> {self.new_value})"
