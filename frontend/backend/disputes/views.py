from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .services import (
    create_dispute,
    list_disputes_for_user,
    get_dispute_for_user,
    add_message,
    resolve_dispute,
)
from .models import DisputeMessage
from .serializers import (
    DisputeCreateSerializer,
    DisputeSerializer,
    DisputeMessageCreateSerializer,
    DisputeMessageSerializer,
)


class DisputeListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        status_filter = request.query_params.get("status")
        disputes = list_disputes_for_user(request.user, status=status_filter)
        return Response(DisputeSerializer(disputes, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = DisputeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        dispute, err = create_dispute(
            user=request.user,
            order_id=serializer.validated_data["order_id"],
            subject=serializer.validated_data["subject"],
            description=serializer.validated_data["description"],
            vendor_id=serializer.validated_data.get("vendor_id"),
        )
        if err:
            return Response({"error": err}, status=status.HTTP_400_BAD_REQUEST)

        return Response(DisputeSerializer(dispute).data, status=status.HTTP_201_CREATED)


class DisputeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, dispute_id):
        dispute = get_dispute_for_user(request.user, dispute_id)
        if not dispute:
            return Response({"error": "Dispute not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(DisputeSerializer(dispute).data, status=status.HTTP_200_OK)


class DisputeMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, dispute_id):
        dispute = get_dispute_for_user(request.user, dispute_id)
        if not dispute:
            return Response({"error": "Dispute not found"}, status=status.HTTP_404_NOT_FOUND)

        msgs = DisputeMessage.objects.filter(dispute_id=dispute_id).select_related("sender").order_by("created_at")
        return Response(DisputeMessageSerializer(msgs, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, dispute_id):
        dispute = get_dispute_for_user(request.user, dispute_id)
        if not dispute:
            return Response({"error": "Dispute not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = DisputeMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        msg, err = add_message(request.user, dispute, serializer.validated_data["message"])
        if err:
            return Response({"error": err}, status=status.HTTP_403_FORBIDDEN)

        return Response(DisputeMessageSerializer(msg).data, status=status.HTTP_201_CREATED)


class DisputeResolveView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, dispute_id):
        dispute = get_dispute_for_user(request.user, dispute_id)
        if not dispute:
            return Response({"error": "Dispute not found"}, status=status.HTTP_404_NOT_FOUND)

        status_value = request.data.get("status")
        resolution_type = request.data.get("resolution_type", "")
        resolution_note = request.data.get("resolution_note", "")

        err = resolve_dispute(
            admin_user=request.user,
            dispute=dispute,
            status_value=status_value,
            resolution_type=resolution_type,
            resolution_note=resolution_note,
        )
        if err:
            return Response({"error": err}, status=status.HTTP_403_FORBIDDEN)

        return Response(DisputeSerializer(dispute).data, status=status.HTTP_200_OK)
