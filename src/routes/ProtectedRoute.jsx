// src/routes/ProtectedRoute.jsx
import React, { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children, allowRoles, redirectToUnauthorized = false }) {
  const location = useLocation();

  // token can be in localStorage OR sessionStorage (rememberMe)
  const token =
    localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

  // ✅ helper: normalize roles (Admin/admin/ ADMIN -> admin)
  const normalizeRole = (r) => (r || "").toString().trim().toLowerCase();

  // ✅ read role safely from multiple places (without breaking your existing bs_user usage)
  const user = useMemo(() => {
    try {
      const raw =
        localStorage.getItem("bs_user") || sessionStorage.getItem("bs_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [token, location.pathname]);

  // ✅ fallback role sources (only used if user.role missing)
  const storedRole =
    localStorage.getItem("bs_role") ||
    sessionStorage.getItem("bs_role") ||
    localStorage.getItem("userRole") ||
    sessionStorage.getItem("userRole") ||
    localStorage.getItem("role") ||
    sessionStorage.getItem("role");

  // Not logged in => go login and remember where user tried to go
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If roles restriction exists
  if (Array.isArray(allowRoles) && allowRoles.length > 0) {
    // ✅ use user.role first, fallback to storedRole, normalize
    const role = normalizeRole(user?.role || storedRole || "student");

    // ✅ normalize allowRoles too (so ["admin"] works even if role is "Admin")
    const allowed = allowRoles.map(normalizeRole);

    if (!allowed.includes(role)) {
      // Option to show unauthorized page instead of redirecting
      if (redirectToUnauthorized) {
        return <Navigate to="/unauthorized" replace />;
      }
      
      // redirect to correct dashboard based on role
      if (role === "admin") return <Navigate to="/admin-dashboard" replace />;
      if (role === "teacher") return <Navigate to="/teacher-dashboard" replace />;
      return <Navigate to="/student-dashboard" replace />;
    }
  }

  return children;
}
