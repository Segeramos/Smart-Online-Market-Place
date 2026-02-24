# backend/vendorpanel/urls.py

from django.urls import path
from .views import (
    VendorApplyView,
    VendorListView,
    VendorDetailView,
)

urlpatterns = [
    # Vendor applies for approval (logged-in user)
    path('apply/', VendorApplyView.as_view(), name='vendor-apply'),

    # Admin: list all vendors (optionally filter by ?status=pending/approved/...)
    path('list/', VendorListView.as_view(), name='vendor-list'),

    # Admin: retrieve / update status / deactivate vendor
    path('<uuid:vendor_id>/', VendorDetailView.as_view(), name='vendor-detail'),
]
