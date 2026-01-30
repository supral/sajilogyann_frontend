import React, { useEffect, useMemo, useState } from "react";
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

  const role = useMemo(() => getRoleFromToken(), []);
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

  useEffect(() => {
    // ✅ if maintenance ON and not admin => force maintenance page
    if (maintenance && role !== "admin" && location.pathname !== "/maintenance") {
      navigate("/maintenance", { replace: true });
    }
    // ✅ if maintenance OFF and currently on maintenance page => go home
    if (!maintenance && location.pathname === "/maintenance") {
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maintenance, location.pathname]);

  return null;
}
