from django.urls import path
from .views import OfferCreateView, PublicOfferListView

urlpatterns = [
    path("public/", PublicOfferListView.as_view(), name="offers-public"),
    path("create/", OfferCreateView.as_view(), name="offer-create"),
]
