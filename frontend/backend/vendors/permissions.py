# vendors/permissions.py

from rest_framework.permissions import BasePermission
from vendors.models import Vendor


class IsVendor(BasePermission):
    """
    Allows access only to authenticated users with role='vendor' (case-insensitive)
    and who have at least one Vendor row in DB linked to them.
    """

    message = "Only vendors can access this endpoint."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            self.message = "Authentication required."
            return False

        role = str(getattr(request.user, "role", "")).strip().lower()
        if role != "vendor":
            self.message = "Only vendors can access this endpoint."
            return False

        # ✅ Direct DB check (most reliable)
        if not Vendor.objects.filter(user=request.user).exists():
            self.message = "Vendor profile not found. Please create/activate your vendor store."
            return False

        return True
