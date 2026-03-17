import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_PREFIXES = ["/api", "/api/v1"];

const safeJson = async (res) => {
  try { return await res.json(); } catch { return {}; }
};

const apiFetchCandidates = async (paths, options = {}) => {
  let last = null;
  for (const prefix of API_PREFIXES) {
    for (const p of paths) {
      const url = `${API_HOST}${prefix}${p}`;
      try {
        const res = await fetch(url, options);
        const data = await safeJson(res);
        if (res.ok) return { data };
        last = { data, url };
      } catch (e) {
        last = { error: e?.message || "Network error", url };
      }
    }
  }
  throw new Error(last?.data?.message || last?.error || `API error: ${last?.url}`);
};

const getRoleFromToken = () => {
  try {
    const t =
      localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");
    if (!t) return null;
    const payload = JSON.parse(atob(t.split(".")[1]));
    return payload?.role || null;
  } catch {
    return null;
  }
};

export default function MaintenanceWatcher() {
  const location = useLocation();
  const navigate = useNavigate();

  // Re-read role when pathname changes so after login we have the correct role (admin vs non-admin)
  const role = useMemo(() => getRoleFromToken(), [location.pathname]);
  const [maintenance, setMaintenance] = useState(false);

  const check = async () => {
    try {
      const { data } = await apiFetchCandidates(["/public/system-status"], {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const mode = !!data?.status?.maintenanceMode;
      setMaintenance(mode);
    } catch {
      // If backend unreachable -> do nothing (you can decide to redirect here too)
    }
  };

  useEffect(() => {
    check();
    const id = setInterval(check, 15000); // refresh every 15s
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Paths visible to everyone during maintenance: landing, login, register, maintenance page, and other public pages
  const isAllowedDuringMaintenance = useMemo(() => {
    const path = location.pathname || "";
    const allowed = [
      "/maintenance",
      "/",
      "/login",
      "/register",
      "/about",
      "/courses",
      "/contact",
      "/privacy-policy",
      "/terms",
      "/faq",
      "/academy",
    ];
    if (allowed.includes(path)) return true;
    if (path.startsWith("/course/")) return true;
    return false;
  }, [location.pathname]);

  useEffect(() => {
    // When maintenance ON and user is not admin => show maintenance page, except on allowed (landing, login, etc.)
    if (
      maintenance &&
      role !== "admin" &&
      !isAllowedDuringMaintenance
    ) {
      navigate("/maintenance", { replace: true });
    }
    if (!maintenance && location.pathname === "/maintenance") {
      navigate("/", { replace: true });
    }
  }, [maintenance, role, location.pathname, isAllowedDuringMaintenance, navigate]);

  return null;
}
