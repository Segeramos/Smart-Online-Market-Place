// src/components/ProtectedRoute.jsx

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAuthed } from "../store/authStore";

export default function ProtectedRoute() {
  const location = useLocation();

  if (!isAuthed()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
