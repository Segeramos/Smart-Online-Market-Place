from django.db import models, transaction
from django.utils.text import slugify
from rest_framework import serializers

from .models import (
    Category,
    CatalogProduct,
    CatalogProductImage,
    Offer,
    Collection,
)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "is_active", "created_at"]


class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = ["id", "name", "slug", "is_active", "created_at"]


class CatalogProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = CatalogProductImage
        fields = ["id", "image", "image_url", "is_primary", "sort_order", "created_at"]
        read_only_fields = ["id", "created_at", "image_url"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if not obj.image:
            return None
        url = obj.image.url
        return request.build_absolute_uri(url) if request else url


class OfferSerializer(serializers.ModelSerializer):
    vendor = serializers.CharField(source="vendor.store_name", read_only=True)
    vendor_id = serializers.IntegerField(source="vendor.id", read_only=True)

    # Effective price (special_price if valid else price)
    effective_price = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = [
            "id",
            "vendor",
            "vendor_id",
            "price",
            "special_price",
            "effective_price",
            "stock",
            "manage_inventory",
            "in_stock",
            "is_active",
            "created_at",
        ]

    def get_effective_price(self, obj):
        sp = getattr(obj, "special_price", None)
        if sp is not None and sp > 0 and sp < obj.price:
            return sp
        return obj.price


# ===============================
# ✅ LEGACY: CatalogProductSerializer
# (Your views import this)
# ===============================
class CatalogProductSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", read_only=True)
    offers = OfferSerializer(many=True, read_only=True)

    best_price = serializers.SerializerMethodField()
    total_offers = serializers.SerializerMethodField()

    class Meta:
        model = CatalogProduct
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "category",
            "is_active",
            "created_at",
            "offers",
            "best_price",
            "total_offers",
        ]

    def get_best_price(self, obj):
        # Use effective price logic if special_price exists
        qs = obj.offers.filter(is_active=True, in_stock=True)
        qs = qs.filter(models.Q(manage_inventory=False) | models.Q(stock__gt=0))

        best = None
        for offer in qs:
            sp = getattr(offer, "special_price", None)
            eff = sp if (sp is not None and sp > 0 and sp < offer.price) else offer.price
            if best is None or eff < best:
                best = eff
        return best

    def get_total_offers(self, obj):
        return obj.offers.filter(is_active=True).count()


class CatalogProductPublicSerializer(serializers.ModelSerializer):
    """
    Customer-facing product serializer.
    Returns catalog + images + offers, plus computed best price.
    """

    category = serializers.CharField(source="category.name", read_only=True)
    category_id = serializers.IntegerField(source="category.id", read_only=True)

    images = CatalogProductImageSerializer(many=True, read_only=True)
    offers = OfferSerializer(many=True, read_only=True)

    best_price = serializers.SerializerMethodField()
    total_offers = serializers.SerializerMethodField()
    primary_image_url = serializers.SerializerMethodField()

    class Meta:
        model = CatalogProduct
        fields = [
            "id",
            "name",
            "slug",
            "category",
            "category_id",
            # content
            "short_description_html",
            "description_html",
            "description",
            # merchandising
            "key_specs",
            "status",
            "condition",
            "brand",
            "tax_class",
            "stockist",
            "warranty_status",
            "warranty_period",
            # seo
            "meta_title",
            "meta_keywords",
            "meta_description",
            # flags/timestamps
            "is_active",
            "created_at",
            # relations
            "images",
            "offers",
            # computed
            "primary_image_url",
            "best_price",
            "total_offers",
        ]

    def get_primary_image_url(self, obj):
        request = self.context.get("request")
        img = obj.images.filter(is_primary=True).order_by("sort_order", "id").first()
        if not img:
            img = obj.images.order_by("sort_order", "id").first()
        if not img or not img.image:
            return None
        url = img.image.url
        return request.build_absolute_uri(url) if request else url

    def get_best_price(self, obj):
        qs = obj.offers.filter(is_active=True, in_stock=True)
        qs = qs.filter(models.Q(manage_inventory=False) | models.Q(stock__gt=0))

        best = None
        for offer in qs:
            sp = getattr(offer, "special_price", None)
            eff = sp if (sp is not None and sp > 0 and sp < offer.price) else offer.price
            if best is None or eff < best:
                best = eff
        return best

    def get_total_offers(self, obj):
        return obj.offers.filter(is_active=True).count()


class VendorProductRetrieveSerializer(serializers.ModelSerializer):
    """
    Vendor edit screen needs catalog fields + THIS vendor's offer + existing images.
    """

    category_id = serializers.IntegerField(source="category.id", read_only=True)
    images = CatalogProductImageSerializer(many=True, read_only=True)
    offer = serializers.SerializerMethodField()

    class Meta:
        model = CatalogProduct
        fields = [
            "id",
            "name",
            "slug",
            "category_id",
            "short_description_html",
            "description_html",
            "description",
            "key_specs",
            "status",
            "condition",
            "brand",
            "tax_class",
            "stockist",
            "warranty_status",
            "warranty_period",
            "meta_title",
            "meta_keywords",
            "meta_description",
            "is_active",
            "created_at",
            "images",
            "offer",
        ]

    def get_offer(self, obj):
        vendor = self.context.get("vendor")
        if vendor is None:
            return None
        offer = obj.offers.filter(vendor=vendor).first()
        return OfferSerializer(offer, context=self.context).data if offer else None


class VendorProductCreateUpdateSerializer(serializers.Serializer):
    """
    Single payload (multipart) to create/update:
    - CatalogProduct fields
    - Offer fields
    - Images (add)
    - Optional image IDs to delete
    - Optional primary image selection
    """

    # ---- CatalogProduct fields ----
    name = serializers.CharField(max_length=255)
    slug = serializers.SlugField(required=False, allow_blank=True)
    category_id = serializers.IntegerField()

    short_description_html = serializers.CharField(required=False, allow_blank=True, default="")
    description_html = serializers.CharField(required=False, allow_blank=True, default="")
    description = serializers.CharField(required=False, allow_blank=True, default="")

    key_specs = serializers.JSONField(required=False, default=dict)

    status = serializers.ChoiceField(choices=CatalogProduct.Status.choices, required=False)
    condition = serializers.ChoiceField(choices=CatalogProduct.Condition.choices, required=False)

    brand = serializers.CharField(required=False, allow_blank=True, default="")
    tax_class = serializers.CharField(required=False, allow_blank=True, default="")
    stockist = serializers.CharField(required=False, allow_blank=True, default="")

    warranty_status = serializers.ChoiceField(
        choices=CatalogProduct.WarrantyStatus.choices, required=False
    )
    warranty_period = serializers.CharField(required=False, allow_blank=True, default="")

    meta_title = serializers.CharField(required=False, allow_blank=True, default="")
    meta_keywords = serializers.CharField(required=False, allow_blank=True, default="")
    meta_description = serializers.CharField(required=False, allow_blank=True, default="")

    is_active = serializers.BooleanField(required=False)

    # Collections are optional; accept list of IDs
    collection_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_empty=True
    )

    # ---- Offer fields ----
    price = serializers.FloatField()
    special_price = serializers.FloatField(required=False, allow_null=True)
    stock = serializers.IntegerField(required=False, default=0)
    manage_inventory = serializers.BooleanField(required=False, default=True)
    in_stock = serializers.BooleanField(required=False, default=True)
    offer_is_active = serializers.BooleanField(required=False, default=True)

    # ---- Images (multipart) ----
    images = serializers.ListField(
        child=serializers.ImageField(),
        required=False,
        allow_empty=True,
    )

    delete_image_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
    )

    primary_image = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        price = attrs.get("price")
        special_price = attrs.get("special_price", None)
        if special_price is not None:
            if special_price <= 0:
                raise serializers.ValidationError({"special_price": "special_price must be > 0"})
            if price is not None and special_price >= price:
                raise serializers.ValidationError(
                    {"special_price": "special_price must be less than price"}
                )
        return attrs

    def _build_unique_slug(self, base_slug: str, instance_id: int | None = None) -> str:
        """
        Ensure slug is unique in CatalogProduct.
        If instance_id is provided, exclude that instance (useful for update).
        """
        base_slug = slugify(base_slug or "") or "product"
        slug_candidate = base_slug

        qs = CatalogProduct.objects.all()
        if instance_id is not None:
            qs = qs.exclude(id=instance_id)

        if not qs.filter(slug=slug_candidate).exists():
            return slug_candidate

        i = 2
        while True:
            slug_candidate = f"{base_slug}-{i}"
            if not qs.filter(slug=slug_candidate).exists():
                return slug_candidate
            i += 1

    def _ensure_slug(self, validated_data: dict, instance_id: int | None = None) -> None:
        """
        - If slug is blank/missing, generate from name.
        - If slug exists, make it unique.
        """
        name = validated_data.get("name") or ""
        raw_slug = (validated_data.get("slug") or "").strip()
        base = raw_slug or name
        validated_data["slug"] = self._build_unique_slug(base, instance_id=instance_id)

    def _apply_primary_image(self, catalog_product, primary_image, new_images_created):
        if not primary_image:
            return

        catalog_product.images.update(is_primary=False)

        if primary_image.startswith("existing:"):
            try:
                image_id = int(primary_image.split(":", 1)[1])
            except Exception:
                return
            img = catalog_product.images.filter(id=image_id).first()
            if img:
                img.is_primary = True
                img.save(update_fields=["is_primary"])

        elif primary_image.startswith("new:"):
            try:
                idx = int(primary_image.split(":", 1)[1])
            except Exception:
                return
            if 0 <= idx < len(new_images_created):
                img = new_images_created[idx]
                img.is_primary = True
                img.save(update_fields=["is_primary"])

    @transaction.atomic
    def create(self, validated_data):
        vendor = self.context.get("vendor")
        if vendor is None:
            raise serializers.ValidationError("Vendor context is required.")

        images = validated_data.pop("images", [])
        delete_image_ids = validated_data.pop("delete_image_ids", [])
        primary_image = validated_data.pop("primary_image", "")

        collection_ids = validated_data.pop("collection_ids", [])

        offer_payload = {
            "price": validated_data.pop("price"),
            "special_price": validated_data.pop("special_price", None),
            "stock": validated_data.pop("stock", 0),
            "manage_inventory": validated_data.pop("manage_inventory", True),
            "in_stock": validated_data.pop("in_stock", True),
            "is_active": validated_data.pop("offer_is_active", True),
        }

        category_id = validated_data.pop("category_id")

        # ✅ ensure unique slug (prevents IntegrityError)
        self._ensure_slug(validated_data)

        catalog = CatalogProduct.objects.create(category_id=category_id, **validated_data)

        if collection_ids:
            catalog.collections.set(collection_ids)

        new_images_created = []
        for i, img in enumerate(images):
            new_images_created.append(
                CatalogProductImage.objects.create(
                    catalog_product=catalog,
                    image=img,
                    is_primary=False,
                    sort_order=i,
                )
            )

        if not primary_image and new_images_created:
            primary_image = "new:0"
        self._apply_primary_image(catalog, primary_image, new_images_created)

        Offer.objects.create(vendor=vendor, catalog_product=catalog, **offer_payload)

        if delete_image_ids:
            catalog.images.filter(id__in=delete_image_ids).delete()

        return catalog

    @transaction.atomic
    def update(self, instance, validated_data):
        vendor = self.context.get("vendor")
        if vendor is None:
            raise serializers.ValidationError("Vendor context is required.")

        images = validated_data.pop("images", [])
        delete_image_ids = validated_data.pop("delete_image_ids", [])
        primary_image = validated_data.pop("primary_image", "")

        collection_ids = validated_data.pop("collection_ids", None)

        # find existing offer once
        existing_offer = instance.offers.filter(vendor=vendor).first()

        # --- Offer fields: only update if provided (PATCH-safe) ---
        offer_fields = ["price", "special_price", "stock", "manage_inventory", "in_stock", "is_active"]
        offer_payload = {}

        # Map your existing field name -> Offer model field
        # (Your serializer defines offer_is_active, but Offer model uses is_active)
        if "offer_is_active" in validated_data and "is_active" not in validated_data:
            offer_payload["is_active"] = validated_data.pop("offer_is_active")

        for f in offer_fields:
            if f in validated_data:
                offer_payload[f] = validated_data.pop(f)

        # If offer fields were sent, update/create the vendor's offer
        if offer_payload:
            if existing_offer:
                for k, v in offer_payload.items():
                    setattr(existing_offer, k, v)
                existing_offer.save()
            else:
                # Only create if we have the minimum required fields
                # price is required in your Offer model
                if "price" not in offer_payload:
                    raise serializers.ValidationError(
                        {"price": "This field is required to create an offer."}
                    )
                Offer.objects.create(
                    catalog_product=instance,
                    vendor=vendor,
                    **offer_payload,
                )

        category_id = validated_data.pop("category_id", None)
        if category_id is not None:
            instance.category_id = category_id

        # ✅ If slug is being updated, ensure uniqueness
        if "slug" in validated_data:
            self._ensure_slug(validated_data, instance_id=instance.id)

        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()

        if collection_ids is not None:
            instance.collections.set(collection_ids)

        if delete_image_ids:
            instance.images.filter(id__in=delete_image_ids).delete()

        start_order = (
            (instance.images.aggregate(models.Max("sort_order")).get("sort_order__max") or 0)
            + 1
        )
        new_images_created = []
        for i, img in enumerate(images):
            new_images_created.append(
                CatalogProductImage.objects.create(
                    catalog_product=instance,
                    image=img,
                    is_primary=False,
                    sort_order=start_order + i,
                )
            )

        if primary_image:
            self._apply_primary_image(instance, primary_image, new_images_created)
        else:
            if not instance.images.filter(is_primary=True).exists():
                first_img = instance.images.order_by("sort_order", "id").first()
                if first_img:
                    instance.images.update(is_primary=False)
                    first_img.is_primary = True
                    first_img.save(update_fields=["is_primary"])

        return instance