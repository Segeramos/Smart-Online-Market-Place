# backend/vendorpanel/urls.py

from django.urls import path
from .views import (
    VendorRegisterView,
    VendorListView,
    VendorDetailView,
)

urlpatterns = [
    path('register/', VendorRegisterView.as_view(), name='vendor-register'),
    path('list/', VendorListView.as_view(), name='vendor-list'),
    path('<uuid:vendor_id>/', VendorDetailView.as_view(), name='vendor-detail'),
]
