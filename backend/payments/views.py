from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .daraja import stk_push
from .models import Payment
from orders.models import Order
from django.conf import settings
from rest_framework import status


class InitiatePaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")
        phone_number = request.data.get("phone_number")

        # Fetch the order for this user
        order = Order.objects.filter(id=order_id, user=request.user).first()
        if not order:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        # Create Payment record
        payment = Payment(order=order, amount=order.total_amount, phone_number=phone_number)
        payment.save()

        # Callback URL for STK Push
        callback_url = f"{settings.BASE_URL}/api/payments/callback/"
        response = stk_push(phone_number, order.total_amount, str(order.id), callback_url)

        return Response({
            "message": "STK Push initiated",
            "response": response,
            "payment_id": str(payment.id)
        }, status=status.HTTP_200_OK)
