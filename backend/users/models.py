import datetime
from mongoengine import Document, StringField, EmailField, BooleanField, DateTimeField
from werkzeug.security import generate_password_hash, check_password_hash

ROLES = ("customer", "vendor", "admin")

class User(Document):
    email = EmailField(required=True, unique=True)
    password_hash = StringField(required=True)
    role = StringField(required=True, choices=ROLES, default="customer")
    is_active = BooleanField(default=True)
    created_at = DateTimeField(default=datetime.datetime.utcnow)

    meta = {
        "collection": "users",
        "indexes": ["email", "role"]
    }

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def __str__(self):
        return self.email
