from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import add_to_cart, remove_from_cart, get_cart, checkout
from .models import Order, OrderItem
from accounts.models import User

# ------------------------------
# Customer Views
# ------------------------------

class CartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all items in the user's cart"""
        cart = get_cart(request.user.email)
        return Response(cart)

    def post(self, request):
        """Add a product to the cart"""
        product_id = request.data.get("product_id")
        quantity = request.data.get("quantity", 1)
        try:
            add_to_cart(request.user.email, product_id, quantity)
            return Response({"message": "Product added to cart"})
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

    def delete(self, request):
        """Remove a product from the cart"""
        product_id = request.data.get("product_id")
        success = remove_from_cart(request.user.email, product_id)
        if success:
            return Response({"message": "Product removed from cart"})
        return Response({"error": "Product not found in cart"}, status=404)


class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Checkout all items in the cart and create an order"""
        try:
            order = checkout(request.user.email)
            return Response({"message": "Order created", "order_id": str(order.id)})
        except ValueError as e:
            return Response({"error": str(e)}, status=400)


# ------------------------------
# Vendor Views
# ------------------------------

class VendorOrderListView(APIView):
    """Vendor view: List all orders belonging to the vendor"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'vendor':
            return Response({"error": "Unauthorized"}, status=403)

        # Filter orders by vendor (requires vendor field in Order model)
        orders = Order.objects.filter(vendor=request.user)
        data = []
        for order in orders:
            items = OrderItem.objects.filter(order=order)
            products = [{"name": item.product.name, "quantity": item.quantity} for item in items]
            data.append({
                "order_id": str(order.id),
                "user_email": order.user_email,
                "total_amount": order.total_amount,
                "status": order.status,
                "products": products,
                "created_at": order.created_at
            })
        return Response(data)


# ------------------------------
# Admin Views
# ------------------------------

class OrderListView(APIView):
    """Admin view: List all orders"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({"error": "Unauthorized"}, status=403)

        orders = Order.objects.all()
        data = []
        for order in orders:
            items = OrderItem.objects.filter(order=order)
            products = [{"name": item.product.name, "quantity": item.quantity} for item in items]
            data.append({
                "order_id": str(order.id),
                "user_email": order.user_email,
                "total_amount": order.total_amount,
                "status": order.status,
                "products": products,
                "created_at": order.created_at
            })
        return Response(data)


class UpdateOrderStatusView(APIView):
    """Admin updates order status"""
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        if request.user.role != 'admin':
            return Response({"error": "Unauthorized"}, status=403)

        status = request.data.get("status")
        order = Order.objects.filter(id=order_id).first()
        if not order:
            return Response({"error": "Order not found"}, status=404)

        order.status = status
        order.save()
        return Response({"message": f"Order status updated to {status}"})
