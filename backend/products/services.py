from .models import Product

def create_product(vendor, validated_data):
    product = Product(
        vendor=vendor,
        name=validated_data["name"],
        slug=validated_data["slug"],
        description=validated_data.get("description", ""),
        price=validated_data["price"],
        stock=validated_data.get("stock", 0),
        category=validated_data["category"],
        is_active=validated_data.get("is_active", True)
    )
    product.save()
    return product
