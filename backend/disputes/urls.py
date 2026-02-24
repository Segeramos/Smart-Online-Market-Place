from django.urls import path
from .views import DisputeListCreateView, DisputeDetailView, DisputeMessagesView, DisputeResolveView

urlpatterns = [
    path("", DisputeListCreateView.as_view(), name="dispute-list-create"),
    path("<int:dispute_id>/", DisputeDetailView.as_view(), name="dispute-detail"),
    path("<int:dispute_id>/messages/", DisputeMessagesView.as_view(), name="dispute-messages"),
    path("<int:dispute_id>/resolve/", DisputeResolveView.as_view(), name="dispute-resolve"),
]
