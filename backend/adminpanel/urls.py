from django.urls import path
from .views import (
    AdminDashboardView,
    VendorListView,
    VendorStatusUpdateView,
    VendorCommissionUpdateView,
    PlatformOrderListView,
    PlatformRevenueView,
    GlobalCommissionView,
    CommissionLogsView,
    ReportingOverviewView,   # ✅ NEW
)

urlpatterns = [
    # Dashboard KPIs
    path('', AdminDashboardView.as_view(), name='admin-dashboard'),

    # ---------------------------
    # Vendor Management
    # ---------------------------
    path('vendors/', VendorListView.as_view(), name='admin-vendor-list'),
    path('vendors/<int:vendor_id>/status/', VendorStatusUpdateView.as_view(), name='admin-vendor-status'),
    path('vendors/<int:vendor_id>/commission/', VendorCommissionUpdateView.as_view(), name='admin-vendor-commission'),

    # ---------------------------
    # Global Commission (Phase 7.2)
    # ---------------------------
    path('commission/', GlobalCommissionView.as_view(), name='admin-global-commission'),
    path('commission/logs/', CommissionLogsView.as_view(), name='admin-commission-logs'),

    # ---------------------------
    # Platform Orders
    # ---------------------------
    path('orders/', PlatformOrderListView.as_view(), name='admin-platform-orders'),

    # ---------------------------
    # Revenue Reporting (Basic)
    # ---------------------------
    path('revenue/', PlatformRevenueView.as_view(), name='admin-platform-revenue'),

    # ---------------------------
    # Phase 7.3: Reporting Overview
    # ---------------------------
    path('reports/overview/', ReportingOverviewView.as_view(), name='admin-reports-overview'),
]
