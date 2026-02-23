from django.urls import path
from .views import (
    CartView,
    CheckoutView,
    OrderListView,
    VendorOrderListView,
    UpdateOrderStatusView
)

urlpatterns = [
    path('cart/', CartView.as_view(), name='cart'),
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('admin/orders/', OrderListView.as_view(), name='order-list'),
    path('vendor/orders/', VendorOrderListView.as_view(), name='vendor-order-list'),
    path('admin/orders/<str:order_id>/update/', UpdateOrderStatusView.as_view(), name='update-order-status'),
]


