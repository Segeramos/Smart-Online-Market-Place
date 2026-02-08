from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json, datetime
from .models import Payment
from orders.models import Order
import logging

logger = logging.getLogger(__name__)

@csrf_exempt
def daraja_callback(request):
    data = json.loads(request.body)
    callback_data = data.get("Body", {}).get("stkCallback", {})
    checkout_request_id = callback_data.get("CheckoutRequestID")
    result_code = callback_data.get("ResultCode")
    result_desc = callback_data.get("ResultDesc")

    payment = Payment.objects(id=checkout_request_id).first()
    if payment:
        if result_code == 0:
            payment.status = "success"

            # ✅ Automatically move the linked order to processing
            order = payment.order
            if order.status == "new":
                order.status = "processing"
                order.updated_at = datetime.datetime.utcnow()
                order.save()
            logger.info(f"Payment successful for Order {order.id}")

        else:
            payment.status = "failed"
            logger.warning(f"Payment failed for Order {payment.order.id}: {result_desc}")

        payment.updated_at = datetime.datetime.utcnow()
        payment.save()

    return JsonResponse({"status": "received"})
