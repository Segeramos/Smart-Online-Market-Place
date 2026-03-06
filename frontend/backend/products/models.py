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


class Collection(models.Model):
    """
    Optional grouping of CatalogProducts (e.g. 'Top Deals', 'Featured', 'Gaming', etc.)
    """
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "collections"
        indexes = [models.Index(fields=["slug"]), models.Index(fields=["is_active"])]

    def __str__(self):
        return self.name


class CatalogProduct(models.Model):
    """
    Platform-owned product page (what customers browse/search)
    Vendors attach offers to this.
    """

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    class Condition(models.TextChoices):
        NEW = "new", "New"
        USED = "used", "Used"
        REFURBISHED = "refurbished", "Refurbished"

    class WarrantyStatus(models.TextChoices):
        NONE = "none", "No warranty"
        MANUFACTURER = "manufacturer", "Manufacturer warranty"
        STORE = "store", "Store warranty"

    # Core
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="catalog_products")

    # Content (rich text HTML fields for your UI)
    short_description_html = models.TextField(blank=True, default="")
    description_html = models.TextField(blank=True, default="")

    # Keep your existing plain text description (still useful for basic admin / fallback)
    description = models.TextField(blank=True)

    # Specs / merchandising
    key_specs = models.JSONField(blank=True, default=dict)  # e.g. {"RAM":"8GB","Storage":"256GB SSD"}
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    condition = models.CharField(max_length=20, choices=Condition.choices, default=Condition.NEW)

    brand = models.CharField(max_length=120, blank=True, default="")
    tax_class = models.CharField(max_length=80, blank=True, default="")
    stockist = models.CharField(max_length=120, blank=True, default="")

    warranty_status = models.CharField(
        max_length=20, choices=WarrantyStatus.choices, default=WarrantyStatus.NONE
    )
    warranty_period = models.CharField(max_length=50, blank=True, default="")  # e.g. "12 months"

    collections = models.ManyToManyField(Collection, blank=True, related_name="catalog_products")

    # SEO
    meta_title = models.CharField(max_length=255, blank=True, default="")
    meta_keywords = models.CharField(max_length=500, blank=True, default="")
    meta_description = models.CharField(max_length=500, blank=True, default="")

    # Flags / timestamps
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "catalog_products"
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["category"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["status"]),
            models.Index(fields=["brand"]),
            models.Index(fields=["name"]),
        ]

    def __str__(self):
        return self.name


class CatalogProductImage(models.Model):
    """
    Image gallery for a CatalogProduct.
    Primary image is what you'll show on cards/search results.
    """
    catalog_product = models.ForeignKey(
        CatalogProduct, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(upload_to="catalog/products/%Y/%m/")
    is_primary = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "catalog_product_images"
        indexes = [
            models.Index(fields=["catalog_product"]),
            models.Index(fields=["is_primary"]),
            models.Index(fields=["sort_order"]),
        ]
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"Image for {self.catalog_product.name}"


class Offer(models.Model):
    # Vendor listing (what vendors actually create/manage)
    catalog_product = models.ForeignKey(CatalogProduct, on_delete=models.CASCADE, related_name="offers")
    vendor = models.ForeignKey("vendors.Vendor", on_delete=models.CASCADE, related_name="offers")

    price = models.FloatField()
    special_price = models.FloatField(null=True, blank=True)

    stock = models.IntegerField(default=0)
    manage_inventory = models.BooleanField(default=True)
    in_stock = models.BooleanField(default=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "offers"
        indexes = [
            models.Index(fields=["vendor"]),
            models.Index(fields=["catalog_product"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["in_stock"]),
            models.Index(fields=["price"]),
        ]
        constraints = [
            # 1 vendor should have only 1 offer per catalog product (common marketplace rule)
            models.UniqueConstraint(fields=["vendor", "catalog_product"], name="uniq_vendor_catalog_offer")
        ]

    def __str__(self):
        return f"{self.catalog_product.name} - {self.vendor.store_name}"