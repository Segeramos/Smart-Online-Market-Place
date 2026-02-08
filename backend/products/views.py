from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer
from .services import create_product

# Public Endpoints
class CategoryListView(APIView):
    def get(self, request):
        categories = Category.objects(is_active=True, parent=None)
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)


class PublicProductListView(APIView):
    def get(self, request):
        category_slug = request.GET.get('category')
        filters = {"is_active": True, "stock__gt": 0}

        if category_slug:
            category = Category.objects(slug=category_slug).first()
            if category:
                filters["category"] = category

        products = Product.objects(**filters)
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)


class ProductDetailView(APIView):
    def get(self, request, slug):
        product = Product.objects(slug=slug, is_active=True).first()
        if not product:
            return Response({"error": "Product not found"}, status=404)
        serializer = ProductSerializer(product)
        return Response(serializer.data)


# Vendor Endpoints
class VendorProductListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor = request.user.vendor
        products = Product.objects(vendor=vendor)
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

    def post(self, request):
        vendor = request.user.vendor
        serializer = ProductSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = create_product(vendor, serializer.validated_data)
        return Response(ProductSerializer(product).data)


class VendorProductDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, product_id):
        vendor = request.user.vendor
        product = Product.objects(id=product_id, vendor=vendor).first()
        if not product:
            return Response({"error": "Not found"}, status=404)

        serializer = ProductSerializer(product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        for key, value in serializer.validated_data.items():
            setattr(product, key, value)

        product.save()
        return Response(ProductSerializer(product).data)

    def delete(self, request, product_id):
        vendor = request.user.vendor
        product = Product.objects(id=product_id, vendor=vendor).first()
        if not product:
            return Response({"error": "Not found"}, status=404)

        product.delete()
        return Response({"message": "Product deleted"})
