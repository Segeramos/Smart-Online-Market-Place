# orders/models.py
from django.db import models
from django.utils import timezone


class CartItem(models.Model):
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="cart_items",
    )
    offer = models.ForeignKey(
        "products.Offer",
        on_delete=models.CASCADE,
        related_name="cart_items",
    )
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "cart_items"
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["offer"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "offer"],
                name="uniq_user_offer_cartitem",
            )
        ]

    def __str__(self):
        return f"{self.user.email} - {self.offer_id} x {self.quantity}"

    def total_price(self):
        return float(self.offer.price) * int(self.quantity)


class Order(models.Model):
    # Order statuses
    STATUS_NEW = "new"
    STATUS_PROCESSING = "processing"
    STATUS_DELIVERED = "delivered"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_NEW, "New"),
        (STATUS_PROCESSING, "Processing"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    # Payment statuses
    PAY_PENDING = "pending"
    PAY_PAID = "paid"
    PAY_FAILED = "failed"

    PAYMENT_STATUS_CHOICES = [
        (PAY_PENDING, "Pending"),
        (PAY_PAID, "Paid"),
        (PAY_FAILED, "Failed"),
    ]

    # Payment methods (future-proof)
    METHOD_MPESA = "mpesa"
    METHOD_STRIPE = "stripe"
    METHOD_PAYPAL = "paypal"

    PAYMENT_METHOD_CHOICES = [
        (METHOD_MPESA, "M-Pesa"),
        (METHOD_STRIPE, "Stripe"),
        (METHOD_PAYPAL, "PayPal"),
    ]

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="orders",
    )
    total_amount = models.FloatField()

    # Delivery address snapshot (store on the order)
    delivery_full_name = models.CharField(max_length=120, blank=True, default="")
    delivery_phone = models.CharField(max_length=20, blank=True, default="")
    delivery_county = models.CharField(max_length=60, blank=True, default="")
    delivery_city = models.CharField(max_length=60, blank=True, default="")
    delivery_area = models.CharField(max_length=120, blank=True, default="")
    delivery_street = models.CharField(max_length=120, blank=True, default="")
    delivery_building = models.CharField(max_length=120, blank=True, default="")
    delivery_house_no = models.CharField(max_length=60, blank=True, default="")
    delivery_notes = models.TextField(blank=True, default="")

    # Payment info
    payment_status = models.CharField(
        max_length=10,
        choices=PAYMENT_STATUS_CHOICES,
        default=PAY_PENDING,
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default=METHOD_MPESA,
    )
    paid_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_NEW,
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "orders"
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["status"]),
            models.Index(fields=["payment_status"]),
        ]

    def __str__(self):
        return f"Order #{self.pk} - {self.user.email} - {self.status}"

    # ---- Rules ----
    def can_set_status(self, new_status: str) -> bool:
        """
        Lock transitions: cannot process or deliver unpaid orders.
        """
        if new_status in {self.STATUS_PROCESSING, self.STATUS_DELIVERED}:
            return self.payment_status == self.PAY_PAID
        return True

    def set_status(self, new_status: str, save: bool = True) -> None:
        if not self.can_set_status(new_status):
            raise ValueError("Order must be paid before it can be processed/delivered.")
        self.status = new_status
        if save:
            self.save(update_fields=["status"])


class OrderItem(models.Model):
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        related_name="items",
    )

    # What customer bought
    offer = models.ForeignKey(
        "products.Offer",
        on_delete=models.PROTECT,
        related_name="order_items",
    )

    # Snapshots for reporting safety
    vendor = models.ForeignKey(
        "vendors.Vendor",
        on_delete=models.PROTECT,
        related_name="order_items",
    )
    catalog_product = models.ForeignKey(
        "products.CatalogProduct",
        on_delete=models.PROTECT,
        related_name="order_items",
    )

    unit_price = models.FloatField()
    quantity = models.PositiveIntegerField(default=1)
    line_total = models.FloatField()

    class Meta:
        db_table = "order_items"
        indexes = [
            models.Index(fields=["order"]),
            models.Index(fields=["vendor"]),
        ]

    def __str__(self):
        return (
            f"Order #{self.order_id} - "
            f"{self.catalog_product.name} x {self.quantity}"
        )
