# payments/views.py

from django.utils import timezone
from django.db import transaction
from django.db.models import F, Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework import status

from orders.models import Order
from vendors.models import VendorPayout
from .models import Payment
from .daraja import stk_push


# ==============================
# 🔥 INITIATE STK PUSH PAYMENT
# ==============================
class InitiatePaymentView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):

        order_id = request.data.get("order_id")
        phone = request.data.get("phone")

        if not order_id or not phone:
            return Response(
                {"detail": "order_id and phone are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        order = Order.objects.filter(id=order_id, user=request.user).first()

        if not order:
            return Response(
                {"detail": "Order not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if order.payment_status == Order.PAY_PAID:
            return Response(
                {"detail": "Order already paid."},
                status=status.HTTP_400_BAD_REQUEST
            )

        amount = float(order.total)

        try:
            result = stk_push(
                phone=phone,
                amount=amount,
                account_reference=str(order.id),
                transaction_desc=f"Payment for order {order.id}"
            )
        except Exception as e:
            return Response(
                {"detail": f"STK push failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        checkout_id = result.get("CheckoutRequestID")
        merchant_id = result.get("MerchantRequestID")

        payment, _ = Payment.objects.get_or_create(order=order)

        payment.phone = phone
        payment.amount = amount
        payment.merchant_request_id = merchant_id
        payment.checkout_request_id = checkout_id
        payment.status = Payment.STATUS_PENDING
        payment.save()

        order.payment_status = Order.PAY_PENDING
        order.save()

        return Response(
            {
                "message": "STK push initiated",
                "order_id": order.id,
                "checkout_request_id": checkout_id,
                "merchant_request_id": merchant_id,
            },
            status=status.HTTP_200_OK
        )


# ==============================
# 🔥 M-PESA CALLBACK
# ==============================
class MpesaCallbackView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):

        payload = request.data
        stk = payload.get("Body", {}).get("stkCallback", {}) or {}

        checkout_id = stk.get("CheckoutRequestID")
        result_code = stk.get("ResultCode")

        payment = Payment.objects.filter(
            checkout_request_id=checkout_id
        ).select_related("order").first()

        if not payment:
            return Response({"status": "ignored"}, status=status.HTTP_200_OK)

        if payment.status == Payment.STATUS_PAID:
            return Response({"status": "already processed"}, status=status.HTTP_200_OK)

        if result_code == 0:

            with transaction.atomic():

                payment = Payment.objects.select_for_update().get(pk=payment.pk)
                order = Order.objects.select_for_update().get(pk=payment.order_id)

                payment.status = Payment.STATUS_PAID
                payment.paid_at = timezone.now()
                payment.save()

                order.payment_status = Order.PAY_PAID
                order.status = Order.STATUS_PROCESSING
                order.paid_at = timezone.now()
                order.save()

                # 🔥 STOCK DEDUCTION
                for oi in order.items.select_related("offer", "catalog_product"):
                    qty = int(oi.quantity)

                    if hasattr(oi.offer, "stock"):
                        type(oi.offer).objects.filter(
                            pk=oi.offer_id,
                            stock__gte=qty
                        ).update(stock=F("stock") - qty)

                    if hasattr(oi.catalog_product, "stock"):
                        type(oi.catalog_product).objects.filter(
                            pk=oi.catalog_product_id,
                            stock__gte=qty
                        ).update(stock=F("stock") - qty)

                # 🔥 VENDOR PAYOUT LOGIC
                vendor_totals = (
                    order.items
                    .values("vendor")
                    .annotate(total=Sum("line_total"))
                )

                for vt in vendor_totals:
                    vendor_id = vt["vendor"]
                    gross = float(vt["total"])

                    oi = order.items.filter(vendor_id=vendor_id).first()
                    vendor = oi.vendor

                    commission = gross * (vendor.commission_rate / 100)
                    net = gross - commission

                    VendorPayout.objects.create(
                        vendor=vendor,
                        order=order,
                        gross_amount=gross,
                        commission_amount=commission,
                        net_amount=net,
                    )

            return Response({"status": "ok"}, status=status.HTTP_200_OK)

        payment.status = Payment.STATUS_FAILED
        payment.save()

        order = payment.order
        order.payment_status = Order.PAY_FAILED
        order.save()

        return Response({"status": "ok"}, status=status.HTTP_200_OK)



