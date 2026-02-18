from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "categories"
        verbose_name_plural = "Categories"
        indexes = [models.Index(fields=["slug"])]

    def __str__(self):
        return self.name


class CatalogProduct(models.Model):
    # Platform-owned product page
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="catalog_products")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "catalog_products"
        indexes = [models.Index(fields=["slug"]), models.Index(fields=["category"])]

    def __str__(self):
        return self.name


class Offer(models.Model):
    # Vendor listing (what vendors actually create/manage)
    catalog_product = models.ForeignKey(CatalogProduct, on_delete=models.CASCADE, related_name="offers")
    vendor = models.ForeignKey("vendors.Vendor", on_delete=models.CASCADE, related_name="offers")
    price = models.FloatField()
    stock = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "offers"
        indexes = [
            models.Index(fields=["vendor"]),
            models.Index(fields=["catalog_product"]),
            models.Index(fields=["is_active"]),
        ]
        constraints = [
            # 1 vendor should have only 1 offer per catalog product (common marketplace rule)
            models.UniqueConstraint(fields=["vendor", "catalog_product"], name="uniq_vendor_catalog_offer")
        ]

    def __str__(self):
        return f"{self.catalog_product.name} - {self.vendor.store_name}"
