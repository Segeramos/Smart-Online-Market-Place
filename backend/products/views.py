from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import Category, CatalogProduct, Offer
from .serializers import CategorySerializer, CatalogProductSerializer, OfferSerializer


class CategoryListView(APIView):
    def get(self, request):
        categories = Category.objects.filter(is_active=True, parent__isnull=True)
        return Response(CategorySerializer(categories, many=True).data)


# Public: list catalog products (optionally filter by category slug)
class PublicCatalogProductListView(APIView):
    def get(self, request):
        category_slug = request.GET.get("category")

        qs = CatalogProduct.objects.filter(is_active=True).select_related("category").order_by("-created_at")

        if category_slug:
            qs = qs.filter(category__slug=category_slug)

        return Response(CatalogProductSerializer(qs, many=True).data)


# Public: product page with all vendor offers
class CatalogProductDetailView(APIView):
    def get(self, request, slug):
        product = (
            CatalogProduct.objects
            .filter(slug=slug, is_active=True)
            .select_related("category")
            .prefetch_related("offers__vendor")
            .first()
        )

        if not product:
            return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(CatalogProductSerializer(product).data)


# Vendor: create/update offer for a catalog product
class VendorOfferListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_vendor(self, request):
        vendor = getattr(request.user, "vendor", None)
        return vendor

    def get(self, request):
        vendor = self.get_vendor(request)
        if not vendor:
            return Response({"error": "Vendor profile not found"}, status=status.HTTP_404_NOT_FOUND)

        offers = Offer.objects.filter(vendor=vendor).select_related("catalog_product").order_by("-created_at")
        return Response(OfferSerializer(offers, many=True).data)

    def post(self, request):
        vendor = self.get_vendor(request)
        if not vendor:
            return Response({"error": "Vendor profile not found"}, status=status.HTTP_404_NOT_FOUND)

        catalog_product_id = request.data.get("catalog_product")
        price = request.data.get("price")
        stock = request.data.get("stock", 0)

        if not catalog_product_id or price is None:
            return Response({"error": "catalog_product and price are required"}, status=status.HTTP_400_BAD_REQUEST)

        catalog_product = CatalogProduct.objects.filter(pk=catalog_product_id, is_active=True).first()
        if not catalog_product:
            return Response({"error": "Catalog product not found"}, status=status.HTTP_404_NOT_FOUND)

        offer, created = Offer.objects.update_or_create(
            vendor=vendor,
            catalog_product=catalog_product,
            defaults={"price": price, "stock": stock, "is_active": True},
        )

        return Response(OfferSerializer(offer).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
