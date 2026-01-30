// bluesheep/src/hooks/useAppLogo.js
import { useState, useEffect } from "react";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_PREFIXES = ["/api", "/api/v1"];

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const apiFetchCandidates = async (paths, options = {}) => {
  let last = null;
  for (const prefix of API_PREFIXES) {
    for (const path of paths) {
      const url = `${API_HOST}${prefix}${path}`;
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
  throw new Error(
    last?.data?.message || last?.error || `API error. Last: ${last?.url}`
  );
};

/**
 * Custom hook to fetch and cache app logo from settings
 */
export const useAppLogo = () => {
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        // Try to get from public system status endpoint
        const { data } = await apiFetchCandidates(["/public/system-status"], {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        // If logo is in public status, use it
        if (data?.settings?.logo) {
          const logo = data.settings.logo;
          const fullUrl = logo.startsWith("http") 
            ? logo 
            : `${API_HOST}${logo}`;
          setLogoUrl(fullUrl);
        } else {
          // Otherwise try to get full settings (admin only)
          const token = localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");
          if (token) {
            try {
              const { data: settingsData } = await apiFetchCandidates(["/admin/settings"], {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              });

              if (settingsData?.settings?.logo) {
                const logo = settingsData.settings.logo;
                const fullUrl = logo.startsWith("http") 
                  ? logo 
                  : `${API_HOST}${logo}`;
                setLogoUrl(fullUrl);
              }
            } catch {
              // Non-admin users will just not get logo
            }
          }
        }
      } catch (error) {
        console.warn("Failed to load app logo:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLogo();
  }, []);

  return { logoUrl, loading };
};
