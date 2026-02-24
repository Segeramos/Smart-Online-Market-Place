# config/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

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
    path("api/vendor/", include("vendor_dashboard.urls")),
    path("api/disputes/", include("disputes.urls")),

    # If you actually have an "offers" app with urls.py and it's in INSTALLED_APPS,
    # keep this. Otherwise remove it to avoid errors.
    # path("offers/", include("offers.urls")),
]

# ✅ Serve uploaded media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)