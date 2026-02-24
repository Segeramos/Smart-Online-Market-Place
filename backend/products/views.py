from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework import serializers
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from vendors.models import Vendor

from .models import Category, CatalogProduct, Offer
from .serializers import (
    CategorySerializer,
    OfferSerializer,
    CatalogProductSerializer,  # legacy public detail serializer you already had
    CatalogProductPublicSerializer,  # customer list/detail (new)
    VendorProductRetrieveSerializer,  # vendor edit payload (new)
    VendorProductCreateUpdateSerializer,  # vendor create/update (new)
)


# ===============================
# ✅ CATEGORY LIST
# ===============================
class CategoryListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        categories = (
            Category.objects.filter(is_active=True)
            .select_related("parent")
            .order_by("name")
        )
        return Response(CategorySerializer(categories, many=True).data)


# ===============================
# ✅ DROPDOWN SERIALIZER (Vendor Add Product)
# ===============================
class CatalogProductDropdownSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = CatalogProduct
        fields = [
            "id",
            "name",
            "slug",
            "category_name",
        ]


# ===============================
# ✅ PUBLIC CATALOG PRODUCT LIST (Dropdown / legacy)
# Used by:
# - Vendor Add Product dropdown
# ===============================
class PublicCatalogProductListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        category_slug = request.GET.get("category")

        qs = (
            CatalogProduct.objects.filter(is_active=True)
            .select_related("category")
            .order_by("name")
        )

        if category_slug:
            qs = qs.filter(category__slug=category_slug)

        serializer = CatalogProductDropdownSerializer(qs, many=True)
        return Response(serializer.data)


# ===============================
# ✅ CUSTOMER: PRODUCT LIST / SEARCH
# GET /api/products/?q=&category=&brand=&min_price=&max_price=&sort=
# sort: newest | price_asc | price_desc | name
# ===============================
class CustomerProductListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        q = (request.GET.get("q") or "").strip()
        category_slug = (request.GET.get("category") or "").strip()
        brand = (request.GET.get("brand") or "").strip()
        min_price = request.GET.get("min_price")
        max_price = request.GET.get("max_price")
        sort = (request.GET.get("sort") or "").strip()

        # Published + active products only (your marketplace catalog)
        qs = (
            CatalogProduct.objects.filter(is_active=True, status=CatalogProduct.Status.PUBLISHED)
            .select_related("category")
            .prefetch_related("images", "offers__vendor")
        )

        if q:
            # Basic launch search (fast enough): name/slug/brand/category name
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(slug__icontains=q)
                | Q(brand__icontains=q)
                | Q(category__name__icontains=q)
            )

        if category_slug:
            qs = qs.filter(category__slug=category_slug)

        if brand:
            qs = qs.filter(brand__iexact=brand)

        # Price filter works by filtering products that have at least one offer in range
        # (We filter offers via join, then distinct products)
        offer_filter = Q(offers__is_active=True, offers__in_stock=True) & (
            Q(offers__manage_inventory=False) | Q(offers__stock__gt=0)
        )

        if min_price:
            try:
                min_price_val = float(min_price)
                offer_filter &= Q(offers__price__gte=min_price_val) | Q(offers__special_price__gte=min_price_val)
            except (TypeError, ValueError):
                pass

        if max_price:
            try:
                max_price_val = float(max_price)
                offer_filter &= Q(offers__price__lte=max_price_val) | Q(offers__special_price__lte=max_price_val)
            except (TypeError, ValueError):
                pass

        if min_price or max_price:
            qs = qs.filter(offer_filter).distinct()

        # Sorting (simple; "best_price" is computed in serializer)
        if sort == "newest":
            qs = qs.order_by("-created_at")
        elif sort == "name":
            qs = qs.order_by("name")
        else:
            # Default
            qs = qs.order_by("name")

        data = CatalogProductPublicSerializer(qs, many=True, context={"request": request}).data

        # If user asks price sorting, do it after serialization using computed best_price
        if sort in ["price_asc", "price_desc"]:
            def key_fn(item):
                bp = item.get("best_price")
                return float(bp) if bp is not None else float("inf")

            data = sorted(data, key=key_fn, reverse=(sort == "price_desc"))

        return Response(data)


# ===============================
# ✅ CUSTOMER: PRODUCT DETAIL
# GET /api/products/<slug>/
# ===============================
class CustomerProductDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        product = (
            CatalogProduct.objects.filter(slug=slug, is_active=True, status=CatalogProduct.Status.PUBLISHED)
            .select_related("category")
            .prefetch_related("images", "offers__vendor")
            .first()
        )

        if not product:
            return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(CatalogProductPublicSerializer(product, context={"request": request}).data)


# ===============================
# ✅ LEGACY PUBLIC PRODUCT DETAIL (kept for compatibility)
# GET /api/catalog/<slug>/  (if you still use it somewhere)
# ===============================
class CatalogProductDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        product = (
            CatalogProduct.objects.filter(slug=slug, is_active=True)
            .select_related("category")
            .prefetch_related("offers__vendor")
            .first()
        )

        if not product:
            return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(CatalogProductSerializer(product).data)


# ===============================
# ✅ Helpers
# ===============================
def get_vendor_for_user(user):
    # Your Vendor model uses related_name="vendors" on user FK
    return Vendor.objects.filter(user=user).order_by("-id").first()


def ensure_vendor_can_act(vendor):
    if not vendor:
        return False, {"error": "Vendor profile not found"}, status.HTTP_404_NOT_FOUND
    if getattr(vendor, "is_blocked", False):
        return False, {"error": "Vendor is not allowed to perform this action"}, status.HTTP_403_FORBIDDEN
    if not getattr(vendor, "is_approved", True):
        return False, {"error": "Vendor is not approved yet"}, status.HTTP_403_FORBIDDEN
    return True, None, None


# ===============================
# ✅ VENDOR: PRODUCTS (Create + List)
# POST /api/vendor/products/   (multipart)
# GET  /api/vendor/products/
# ===============================
class VendorProductListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        vendor = get_vendor_for_user(request.user)
        ok, payload, code = ensure_vendor_can_act(vendor)
        if not ok:
            return Response(payload, status=code)

        # list catalog products where THIS vendor has offers
        qs = (
            CatalogProduct.objects.filter(offers__vendor=vendor)
            .select_related("category")
            .prefetch_related("images", "offers__vendor")
            .distinct()
            .order_by("-created_at")
        )

        return Response(
            VendorProductRetrieveSerializer(
                qs, many=True, context={"request": request, "vendor": vendor}
            ).data
        )

    def post(self, request):
        vendor = get_vendor_for_user(request.user)
        ok, payload, code = ensure_vendor_can_act(vendor)
        if not ok:
            return Response(payload, status=code)

        serializer = VendorProductCreateUpdateSerializer(
            data=request.data, context={"request": request, "vendor": vendor}
        )
        serializer.is_valid(raise_exception=True)
        catalog_product = serializer.save()

        return Response(
            VendorProductRetrieveSerializer(
                catalog_product, context={"request": request, "vendor": vendor}
            ).data,
            status=status.HTTP_201_CREATED,
        )


# ===============================
# ✅ VENDOR: PRODUCT (Get for edit + Update)
# GET   /api/vendor/products/<id>/
# PATCH /api/vendor/products/<id>/   (multipart)
# ===============================
class VendorProductDetailView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self, pk):
        return CatalogProduct.objects.filter(pk=pk).prefetch_related("images", "offers__vendor").select_related("category").first()

    def get(self, request, pk):
        vendor = get_vendor_for_user(request.user)
        ok, payload, code = ensure_vendor_can_act(vendor)
        if not ok:
            return Response(payload, status=code)

        product = self.get_object(pk)
        if not product:
            return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        # Vendor must own an offer for this catalog product to edit it (typical marketplace rule)
        if not Offer.objects.filter(vendor=vendor, catalog_product=product).exists():
            return Response({"error": "You do not have an offer for this product"}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            VendorProductRetrieveSerializer(
                product, context={"request": request, "vendor": vendor}
            ).data
        )

    def patch(self, request, pk):
        vendor = get_vendor_for_user(request.user)
        ok, payload, code = ensure_vendor_can_act(vendor)
        if not ok:
            return Response(payload, status=code)

        product = self.get_object(pk)
        if not product:
            return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        # Vendor must own an offer for this catalog product to update it
        if not Offer.objects.filter(vendor=vendor, catalog_product=product).exists():
            return Response({"error": "You do not have an offer for this product"}, status=status.HTTP_403_FORBIDDEN)

        serializer = VendorProductCreateUpdateSerializer(
            product,
            data=request.data,
            partial=True,
            context={"request": request, "vendor": vendor},
        )
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()

        return Response(
            VendorProductRetrieveSerializer(updated, context={"request": request, "vendor": vendor}).data,
            status=status.HTTP_200_OK,
        )


# ===============================
# ✅ VENDOR OFFERS (legacy)
# kept as-is for backwards compatibility
# ===============================
class VendorOfferListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_vendor(self, request):
        # keep legacy behavior, but make it work with your Vendor model design
        return get_vendor_for_user(request.user)

    def get(self, request):
        vendor = self.get_vendor(request)
        if not vendor:
            return Response({"error": "Vendor profile not found"}, status=status.HTTP_404_NOT_FOUND)

        offers = (
            Offer.objects.filter(vendor=vendor)
            .select_related("catalog_product")
            .order_by("-created_at")
        )
        return Response(OfferSerializer(offers, many=True).data)

    def post(self, request):
        vendor = self.get_vendor(request)
        if not vendor:
            return Response({"error": "Vendor profile not found"}, status=status.HTTP_404_NOT_FOUND)

        catalog_product_id = request.data.get("catalog_product")
        price = request.data.get("price")
        stock = request.data.get("stock", 0)

        if not catalog_product_id or price is None:
            return Response(
                {"error": "catalog_product and price are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            price = float(price)
        except (TypeError, ValueError):
            return Response({"error": "price must be a number"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            stock = int(stock)
        except (TypeError, ValueError):
            stock = 0

        catalog_product = CatalogProduct.objects.filter(pk=catalog_product_id, is_active=True).first()
        if not catalog_product:
            return Response({"error": "Catalog product not found"}, status=status.HTTP_404_NOT_FOUND)

        offer, created = Offer.objects.update_or_create(
            vendor=vendor,
            catalog_product=catalog_product,
            defaults={"price": price, "stock": stock, "is_active": True},
        )

        return Response(
            OfferSerializer(offer).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )