from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from vendors.models import Vendor
from products.models import CatalogProduct, Offer


class OfferCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        catalog_product_id = request.data.get("catalog_product_id")
        price = request.data.get("price")
        stock = request.data.get("stock", 0)

        if not catalog_product_id or price is None:
            return Response({"error": "catalog_product_id and price are required"}, status=400)

        vendor = Vendor.objects.filter(
            user=request.user,
            status=Vendor.Status.APPROVED,
            is_active=True
        ).first()

        if not vendor:
            return Response({"error": "Vendor not approved"}, status=status.HTTP_403_FORBIDDEN)

        catalog_product = CatalogProduct.objects.filter(id=catalog_product_id, is_active=True).first()
        if not catalog_product:
            return Response({"error": "Catalog product not found"}, status=404)

        try:
            price = float(price)
            stock = int(stock)
        except (TypeError, ValueError):
            return Response({"error": "Invalid price/stock"}, status=400)

        try:
            offer = Offer.objects.create(
                catalog_product=catalog_product,
                vendor=vendor,
                price=price,
                stock=stock,
                is_active=True,
            )
        except Exception:
            return Response({"error": "Offer already exists for this product"}, status=400)

        return Response(
            {
                "id": offer.id,
                "catalog_product": offer.catalog_product.name,
                "vendor": offer.vendor.store_name,
                "price": offer.price,
                "stock": offer.stock,
                "is_active": offer.is_active,
                "created_at": offer.created_at,
            },
            status=status.HTTP_201_CREATED,
        )


class PublicOfferListView(APIView):
    def get(self, request):
        offers = Offer.objects.select_related("vendor", "catalog_product").filter(
            is_active=True,
            vendor__status=Vendor.Status.APPROVED,
            vendor__is_active=True,
            catalog_product__is_active=True
        ).order_by("-created_at")

        data = [
            {
                "id": o.id,
                "product": o.catalog_product.name,
                "product_slug": o.catalog_product.slug,
                "vendor": o.vendor.store_name,
                "price": o.price,
                "stock": o.stock,
                "created_at": o.created_at,
            }
            for o in offers
        ]
        return Response(data, status=status.HTTP_200_OK)
