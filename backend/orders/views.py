from django.db import transaction
from django.db.models import F
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsAdmin, IsVendor
from products.models import Offer
from vendors.models import Vendor
from .models import CartItem, Order, OrderItem


class CartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = CartItem.objects.select_related(
            "offer", "offer__vendor", "offer__catalog_product"
        ).filter(user=request.user)

        data = []
        subtotal = 0.0

        for i in items:
            total = float(i.offer.price) * int(i.quantity)
            subtotal += total

            data.append({
                "id": i.id,
                "offer_id": i.offer.id,
                "product": i.offer.catalog_product.name,
                "vendor": i.offer.vendor.store_name,
                "price": i.offer.price,
                "quantity": i.quantity,
                "total": total,
            })

        return Response({"items": data, "subtotal": subtotal}, status=200)

    def post(self, request):
        offer_id = request.data.get("offer_id")
        qty = request.data.get("quantity", 1)

        try:
            qty = int(qty)
            if qty < 1:
                raise ValueError()
        except (TypeError, ValueError):
            return Response({"error": "quantity must be a positive integer"}, status=400)

        offer = Offer.objects.filter(
            id=offer_id,
            is_active=True,
            vendor__status=Vendor.Status.APPROVED,
            vendor__is_active=True,
            catalog_product__is_active=True
        ).first()

        if not offer:
            return Response({"error": "Offer not available"}, status=404)

        item, created = CartItem.objects.get_or_create(
            user=request.user,
            offer=offer,
            defaults={"quantity": qty},
        )

        if not created:
            item.quantity = item.quantity + qty
            item.save(update_fields=["quantity"])

        return Response({"message": "Added to cart", "cart_item_id": item.id}, status=201)


class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        cart_items = CartItem.objects.select_for_update().select_related(
            "offer", "offer__vendor", "offer__catalog_product"
        ).filter(user=request.user)

        if not cart_items.exists():
            return Response({"error": "Cart is empty"}, status=400)

        order = Order.objects.create(user=request.user, total_amount=0.0, status=Order.STATUS_NEW)

        total = 0.0

        for ci in cart_items:
            offer = ci.offer

            # Offer still valid?
            if not offer.is_active or not offer.catalog_product.is_active:
                return Response({"error": f"Offer {offer.id} is no longer available"}, status=400)

            # Vendor still approved?
            if offer.vendor.status != Vendor.Status.APPROVED or not offer.vendor.is_active:
                return Response({"error": f"Vendor for offer {offer.id} is not approved"}, status=400)

            # Atomic stock decrement
            updated = Offer.objects.filter(
                id=offer.id,
                stock__gte=ci.quantity
            ).update(stock=F("stock") - ci.quantity)

            if updated != 1:
                return Response({"error": f"Stock changed for offer {offer.id}. Try again."}, status=409)

            line_total = float(offer.price) * int(ci.quantity)

            OrderItem.objects.create(
                order=order,
                offer=offer,
                vendor=offer.vendor,
                catalog_product=offer.catalog_product,
                unit_price=float(offer.price),
                quantity=int(ci.quantity),
                line_total=line_total,
            )

            total += line_total

        order.total_amount = total
        order.save(update_fields=["total_amount"])

        cart_items.delete()

        return Response(
            {"message": "Order created", "order_id": order.id, "total_amount": order.total_amount},
            status=201
        )


class OrderListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        orders = Order.objects.select_related("user").all().order_by("-created_at")
        data = [{
            "id": o.id,
            "user": o.user.email,
            "status": o.status,
            "total": o.total_amount,
            "created_at": o.created_at,
        } for o in orders]
        return Response(data, status=200)


class VendorOrderListView(APIView):
    permission_classes = [IsVendor]

    def get(self, request):
        items = OrderItem.objects.select_related(
            "order", "catalog_product", "vendor"
        ).filter(vendor__user=request.user).order_by("-order__created_at")

        data = [{
            "order_id": oi.order.id,
            "product": oi.catalog_product.name,
            "quantity": oi.quantity,
            "line_total": oi.line_total,
            "order_status": oi.order.status,
            "created_at": oi.order.created_at,
        } for oi in items]

        return Response(data, status=200)


class UpdateOrderStatusView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, order_id):
        new_status = request.data.get("status")

        allowed_statuses = {k for k, _ in Order.STATUS_CHOICES}
        if new_status not in allowed_statuses:
            return Response({"error": "Invalid status"}, status=400)

        order = Order.objects.filter(id=order_id).first()
        if not order:
            return Response({"error": "Order not found"}, status=404)

        order.status = new_status
        order.save(update_fields=["status"])

        return Response({"message": "Order status updated", "status": order.status}, status=200)
