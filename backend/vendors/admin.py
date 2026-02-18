from django.contrib import admin
from .models import Vendor


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = (
        "store_name",
        "user",
        "status",          # ✅ NEW
        "is_active",
        "commission_rate",
        "created_at",
    )

    search_fields = ("store_name", "user__email")

    list_filter = (
        "status",          # ✅ NEW
        "is_active",
    )

    readonly_fields = ("created_at", "updated_at")
