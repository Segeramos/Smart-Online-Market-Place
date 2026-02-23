// src/components/RoleRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAuthed, getRole, normalizeRole } from "../store/authStore";

export default function RoleRoute({ allowed = [] }) {
  const location = useLocation();

  const authed = isAuthed();
  const role = normalizeRole(getRole());

  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];
  const normalizedAllowed = allowedRoles.map(normalizeRole).filter(Boolean);

  if (normalizedAllowed.length === 0) {
    return <Outlet />;
  }

  if (!role || !normalizedAllowed.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}