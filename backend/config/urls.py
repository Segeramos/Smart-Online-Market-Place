# config/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # Django admin
    path("admin/", admin.site.urls),

    # API endpoints
    path("api/accounts/", include("accounts.urls")),
    path("api/vendors/", include("vendors.urls")),
    path("api/products/", include("products.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/adminpanel/", include("adminpanel.urls")),

    # ✅ PHASE 6: Vendor Dashboard (keep this ABOVE any generic catch-alls)
    path("api/vendor/", include("vendor_dashboard.urls")),

    # Public product browsing (homepage / landing)
    path("", include("products.urls")),

    # If you really have a separate offers app, keep it OUTSIDE api/vendor/
    path("offers/", include("offers.urls")),
]
