from django.urls import path
from .views import InitiatePaymentView

urlpatterns = [
    # Endpoint to initiate a payment
    path("initiate/", InitiatePaymentView.as_view(), name="initiate-payment"),
]
