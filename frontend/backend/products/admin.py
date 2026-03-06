from django.contrib import admin
from .models import Category, CatalogProduct, Offer


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "parent", "is_active", "created_at")
    search_fields = ("name", "slug")
    list_filter = ("is_active",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(CatalogProduct)
class CatalogProductAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "category", "is_active", "created_at")
    search_fields = ("name", "slug")
    list_filter = ("is_active", "category")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ("catalog_product", "vendor", "price", "stock", "is_active", "created_at")
    search_fields = ("catalog_product__name", "vendor__store_name")
    list_filter = ("is_active", "vendor")
