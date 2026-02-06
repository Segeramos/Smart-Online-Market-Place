from django.urls import path
from .views import VendorRegisterView, VendorListView

urlpatterns = [
    path('register/', VendorRegisterView.as_view(), name='vendor-register'),
    path('all/', VendorListView.as_view(), name='vendor-list'),
]
