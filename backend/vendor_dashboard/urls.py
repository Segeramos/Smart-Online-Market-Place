# vendor_dashboard/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    VendorOfferViewSet,
    VendorOrderListView,
    VendorOrderDetailView,
    VendorEarningsSummaryView,
    VendorPayoutListView,
    VendorAnalyticsOverviewView,
    VendorAnalyticsTopProductsView,
    VendorAnalyticsDailySalesView,
)

router = DefaultRouter()
router.register(r"offers", VendorOfferViewSet, basename="vendor-offers")

urlpatterns = [
    path("", include(router.urls)),

    # Phase 6 Step 2: Vendor Orders
    path("orders/", VendorOrderListView.as_view(), name="vendor-orders"),
    path("orders/<int:order_id>/", VendorOrderDetailView.as_view(), name="vendor-order-detail"),

    # Phase 6 Step 3: Earnings
    path("earnings/summary/", VendorEarningsSummaryView.as_view(), name="vendor-earnings-summary"),
    path("earnings/payouts/", VendorPayoutListView.as_view(), name="vendor-payouts"),

    # Phase 6 Step 4: Analytics
    path("analytics/overview/", VendorAnalyticsOverviewView.as_view(), name="vendor-analytics-overview"),
    path("analytics/top-products/", VendorAnalyticsTopProductsView.as_view(), name="vendor-analytics-top-products"),
    path("analytics/daily-sales/", VendorAnalyticsDailySalesView.as_view(), name="vendor-analytics-daily-sales"),
]
