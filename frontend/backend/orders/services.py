# orders/services.py
from django.apps import apps
from django.db import transaction
from django.utils import timezone


def add_to_cart(user, offer_id, quantity=1):
    """Add an offer (vendor listing) to the user's cart"""
    if quantity < 1:
        raise ValueError("Quantity must be at least 1")

    CartItem = apps.get_model("orders", "CartItem")
    Offer = apps.get_model("products", "Offer")

    offer = (
        Offer.objects.select_related("catalog_product", "vendor")
        .filter(pk=offer_id, is_active=True)
        .first()
    )
    if not offer:
        raise ValueError("Offer not found")

    cart_item, created = CartItem.objects.get_or_create(
        user=user,
        offer=offer,
        defaults={"quantity": quantity},
    )
    if not created:
        cart_item.quantity += int(quantity)
        cart_item.save(update_fields=["quantity"])

    return cart_item


def remove_from_cart(user, offer_id):
    """Remove an offer from the user's cart"""
    CartItem = apps.get_model("orders", "CartItem")
    deleted, _ = CartItem.objects.filter(user=user, offer_id=offer_id).delete()
    return deleted > 0


def get_cart(user):
    """Retrieve all cart items for a user"""
    CartItem = apps.get_model("orders", "CartItem")

    items = (
        CartItem.objects
        .filter(user=user)
        .select_related("offer__catalog_product", "offer__vendor")
    )

    cart_data = []
    total = 0.0

    for item in items:
        line_total = float(item.offer.price) * int(item.quantity)
        cart_data.append({
            "offer_id": item.offer_id,
            "catalog_product_id": item.offer.catalog_product_id,
            "name": item.offer.catalog_product.name,
            "vendor": item.offer.vendor.store_name,
            "price": float(item.offer.price),
            "quantity": int(item.quantity),
            "total_price": line_total,
        })
        total += line_total

    return {"items": cart_data, "total": total}


@transaction.atomic
def checkout(user):
    """
    Create an order from the cart items and clear the cart.
    """
    CartItem = apps.get_model("orders", "CartItem")
    Order = apps.get_model("orders", "Order")
    OrderItem = apps.get_model("orders", "OrderItem")

    items = (
        CartItem.objects
        .select_for_update()
        .filter(user=user)
        .select_related("offer__catalog_product", "offer__vendor")
    )

    if not items.exists():
        raise ValueError("Cart is empty")

    # Stock validation
    for item in items:
        if int(item.quantity) > float(item.offer.stock):
            raise ValueError(f"Not enough stock for {item.offer.catalog_product.name}")

    total_amount = sum(float(i.offer.price) * int(i.quantity) for i in items)

    order = Order.objects.create(
        user=user,
        total_amount=total_amount,
        status="new",
        created_at=timezone.now(),
    )

    # Create order items + reduce stock
    for item in items:
        qty = int(item.quantity)
        unit_price = float(item.offer.price)

        OrderItem.objects.create(
            order=order,
            offer=item.offer,
            vendor=item.offer.vendor,
            catalog_product=item.offer.catalog_product,
            unit_price=unit_price,
            quantity=qty,
            line_total=unit_price * qty,
        )

        # reduce stock
        item.offer.stock = float(item.offer.stock) - qty
        item.offer.save(update_fields=["stock"])

    # Clear cart
    items.delete()

    return order
