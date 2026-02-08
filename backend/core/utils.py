import re
import unicodedata

def generate_slug(text):
    """
    Convert a string into a URL-friendly slug
    Example: "New Product!" -> "new-product"
    """
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text.lower())
    text = re.sub(r"[-\s]+", "-", text).strip("-")
    return text
