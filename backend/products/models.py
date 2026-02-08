from mongoengine import Document, StringField, FloatField, ReferenceField, BooleanField, DateTimeField
from vendors.models import Vendor
import datetime

class Category(Document):
    name = StringField(required=True)
    slug = StringField(required=True, unique=True)
    parent = ReferenceField('self', null=True, default=None)
    is_active = BooleanField(default=True)
    created_at = DateTimeField(default=datetime.datetime.utcnow)

    meta = {
        "collection": "categories",
        "indexes": ["slug"]
    }

    def __str__(self):
        return self.name


class Product(Document):
    name = StringField(required=True)
    slug = StringField(required=True, unique=True)
    description = StringField()
    price = FloatField(required=True)
    stock = FloatField(default=0)
    category = ReferenceField(Category, required=True)
    vendor = ReferenceField(Vendor, required=True)
    is_active = BooleanField(default=True)
    created_at = DateTimeField(default=datetime.datetime.utcnow)

    meta = {
        "collection": "products",
        "indexes": ["slug", "vendor"]
    }

    def __str__(self):
        return self.name
