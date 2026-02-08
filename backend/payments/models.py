import datetime
from mongoengine import Document, ReferenceField, FloatField, StringField, DateTimeField
from orders.models import Order

class Payment(Document):
    order = ReferenceField(Order, required=True)
    amount = FloatField(required=True)
    phone_number = StringField(required=True)
    mpesa_code = StringField()  # Daraja payment code
    status = StringField(
        choices=["pending", "success", "failed"],
        default="pending"
    )
    created_at = DateTimeField(default=datetime.datetime.utcnow)
    updated_at = DateTimeField(default=datetime.datetime.utcnow)

    meta = {
        "collection": "payments",
        "indexes": ["order", "status"]
    }
