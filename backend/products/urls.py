from django.urls import path
from .views import (
    CategoryListView,
    PublicProductListView,
    ProductDetailView,
    VendorProductListCreateView,
    VendorProductDetailView
)

urlpatterns = [
    # Public endpoints
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('', PublicProductListView.as_view(), name='public-product-list'),
    path('<slug:slug>/', ProductDetailView.as_view(), name='product-detail'),

    # Vendor endpoints
    path('vendor/', VendorProductListCreateView.as_view(), name='vendor-product-list-create'),
    path('vendor/<str:product_id>/', VendorProductDetailView.as_view(), name='vendor-product-detail'),
]
