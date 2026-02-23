# products/urls.py

from django.urls import path
from .views import (
    CategoryListView,
    PublicCatalogProductListView,   # legacy dropdown
    CatalogProductDetailView,       # legacy public detail
    CustomerProductListView,        # NEW (customer search/list)
    CustomerProductDetailView,      # NEW (customer detail)
    VendorProductListCreateView,    # NEW (vendor list + create)
    VendorProductDetailView,        # NEW (vendor get + update)
    VendorOfferListCreateView,      # legacy offers
)

urlpatterns = [
    # ===============================
    # CATEGORIES
    # ===============================
    path("categories/", CategoryListView.as_view(), name="category-list"),

    # ===============================
    # VENDOR-FACING (NEW)
    # ===============================
    # GET  /api/products/vendor/
    # POST /api/products/vendor/
    path("vendor/", VendorProductListCreateView.as_view(), name="vendor-product-list-create"),

    # GET   /api/products/vendor/<id>/
    # PATCH /api/products/vendor/<id>/
    path("vendor/<int:pk>/", VendorProductDetailView.as_view(), name="vendor-product-detail"),

    # ===============================
    # LEGACY (kept for compatibility)
    # ===============================
    # Vendor dropdown list of public catalog products
    path("catalog/", PublicCatalogProductListView.as_view(), name="catalog-product-list"),

    # Legacy public detail
    path("catalog/<slug:slug>/", CatalogProductDetailView.as_view(), name="catalog-product-detail"),

    # Legacy vendor offers endpoint
    path("offers/", VendorOfferListCreateView.as_view(), name="vendor-offers"),

    # ===============================
    # CUSTOMER-FACING (NEW)
    # ===============================
    # GET /api/products/?q=&category=&brand=&min_price=&max_price=&sort=
    path("", CustomerProductListView.as_view(), name="customer-product-list"),

    # IMPORTANT: keep this LAST so it doesn't swallow "vendor/", "catalog/", "offers/", etc.
    # GET /api/products/<slug>/
    path("<slug:slug>/", CustomerProductDetailView.as_view(), name="customer-product-detail"),
]