# products/urls.py

from django.urls import path
from .views import (
    CategoryListView,
    PublicCatalogProductListView,
    CatalogProductDetailView,
)

urlpatterns = [
    # These will be mounted under /api/products/ by config/urls.py
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("products/", PublicCatalogProductListView.as_view(), name="catalog-product-list"),
    path("products/<slug:slug>/", CatalogProductDetailView.as_view(), name="catalog-product-detail"),
]
