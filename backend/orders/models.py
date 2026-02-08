# orders/models.py
from mongoengine import Document, StringField, FloatField, ReferenceField, IntField, DateTimeField, ListField
import datetime

# Reference Django User by email only
# Products referenced via MongoEngine

class CartItem(Document):
    user_email = StringField(required=True)  # Django user email
    product = ReferenceField('products.Product', required=True)
    quantity = IntField(default=1, required=True)
    created_at = DateTimeField(default=datetime.datetime.utcnow)

    meta = {
        "collection": "cart_items",
        "indexes": ["user_email"]
    }

    def total_price(self):
        return self.product.price * self.quantity


class Order(Document):
    user_email = StringField(required=True)  # Django user email
    total_amount = FloatField(required=True)
    status = StringField(default='new')  # new → processing → delivered
    created_at = DateTimeField(default=datetime.datetime.utcnow)

    meta = {
        "collection": "orders",
        "indexes": ["user_email", "status"]
    }


class OrderItem(Document):
    order = ReferenceField(Order, required=True)
    product = ReferenceField('products.Product', required=True)
    quantity = IntField(default=1, required=True)

    meta = {
        "collection": "order_items",
        "indexes": ["order"]
    }
