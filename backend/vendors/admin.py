from django.contrib import admin
from .models import Vendor, VendorPayout


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "is_active",
    )

    search_fields = (
        "user__email",
        "user__username",
    )

    list_filter = (
        "is_active",
    )


@admin.register(VendorPayout)
class VendorPayoutAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "vendor",
        "order",
        "gross_amount",
        "commission_amount",
        "net_amount",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
        "created_at",
    )

    search_fields = (
        "vendor__user__email",
        "order__id",
    )

    ordering = (
        "-created_at",
    )