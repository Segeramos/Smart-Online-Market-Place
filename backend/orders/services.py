# orders/services.py
from .models import CartItem, Order, OrderItem
from products.models import Product
import datetime

def add_to_cart(user_email, product_id, quantity=1):
    """Add a product to the user's cart"""
    product = Product.objects(id=product_id).first()
    if not product:
        raise ValueError("Product not found")

    cart_item = CartItem.objects(user_email=user_email, product=product).first()
    if cart_item:
        cart_item.quantity += quantity
        cart_item.save()
    else:
        CartItem(user_email=user_email, product=product, quantity=quantity).save()
    return True

def remove_from_cart(user_email, product_id):
    """Remove a product from the user's cart"""
    cart_item = CartItem.objects(user_email=user_email, product=product_id).first()
    if cart_item:
        cart_item.delete()
        return True
    return False

def get_cart(user_email):
    """Retrieve all cart items for a user"""
    items = CartItem.objects(user_email=user_email)
    cart_data = []
    total = 0
    for item in items:
        cart_data.append({
            "product_id": str(item.product.id),
            "name": item.product.name,
            "price": item.product.price,
            "quantity": item.quantity,
            "total_price": item.total_price()
        })
        total += item.total_price()
    return {"items": cart_data, "total": total}

def checkout(user_email):
    """Create an order from the cart items and clear the cart"""
    items = CartItem.objects(user_email=user_email)
    if not items:
        raise ValueError("Cart is empty")

    total_amount = sum([item.total_price() for item in items])
    order = Order(user_email=user_email, total_amount=total_amount, status="new").save()

    for item in items:
        OrderItem(order=order, product=item.product, quantity=item.quantity).save()
        item.delete()  # remove from cart

    return order
