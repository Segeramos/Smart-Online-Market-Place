from django.db import models
from django.utils import timezone


class Dispute(models.Model):
    STATUS_OPEN = "open"
    STATUS_IN_REVIEW = "in_review"
    STATUS_RESOLVED = "resolved"
    STATUS_REJECTED = "rejected"
    STATUS_CLOSED = "closed"

    STATUS_CHOICES = [
        (STATUS_OPEN, "Open"),
        (STATUS_IN_REVIEW, "In Review"),
        (STATUS_RESOLVED, "Resolved"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_CLOSED, "Closed"),
    ]

    RESOLUTION_REFUND = "refund"
    RESOLUTION_REPLACE = "replace"
    RESOLUTION_PARTIAL_REFUND = "partial_refund"
    RESOLUTION_CANCEL = "cancel"
    RESOLUTION_OTHER = "other"

    RESOLUTION_CHOICES = [
        (RESOLUTION_REFUND, "Refund"),
        (RESOLUTION_REPLACE, "Replacement"),
        (RESOLUTION_PARTIAL_REFUND, "Partial Refund"),
        (RESOLUTION_CANCEL, "Cancel Order"),
        (RESOLUTION_OTHER, "Other"),
    ]

    created_by = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="disputes_created")
    order = models.ForeignKey("orders.Order", on_delete=models.CASCADE, related_name="disputes")

    vendor = models.ForeignKey("vendors.Vendor", on_delete=models.SET_NULL, null=True, blank=True, related_name="disputes")

    subject = models.CharField(max_length=180)
    description = models.TextField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN, db_index=True)

    assigned_admin = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="disputes_assigned",
    )

    resolution_type = models.CharField(max_length=30, choices=RESOLUTION_CHOICES, blank=True, default="")
    resolution_note = models.TextField(blank=True, default="")
    resolved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "disputes"

    def __str__(self):
        return f"Dispute #{self.pk} ({self.status})"


class DisputeMessage(models.Model):
    dispute = models.ForeignKey("disputes.Dispute", on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="dispute_messages")

    message = models.TextField()
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "dispute_messages"

    def __str__(self):
        return f"Msg #{self.pk} Dispute #{self.dispute_id}"
