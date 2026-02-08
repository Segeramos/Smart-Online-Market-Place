# backend/vendors/models.py

import datetime
from mongoengine import Document, StringField, FloatField, BooleanField, ReferenceField, DateTimeField

# Use a string reference to User since it's a Django model
# MongoEngine can store it as a DBRef
# If you later want to fully migrate accounts to MongoEngine, you can change User to a Document too
class Vendor(Document):
    user = ReferenceField('accounts.User', required=True)  # Reference to User
    store_name = StringField(required=True)
    description = StringField()
    commission_rate = FloatField(default=0.0)
    is_active = BooleanField(default=True)
    created_at = DateTimeField(default=datetime.datetime.utcnow)
    updated_at = DateTimeField(default=datetime.datetime.utcnow)

    meta = {
        "collection": "vendors",
        "indexes": ["user", "store_name", "is_active"]
    }

    def __str__(self):
        return f"{self.store_name} ({self.user.email})"
