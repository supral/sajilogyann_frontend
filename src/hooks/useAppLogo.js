// sajilogyaan/src/hooks/useAppLogo.js
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

const DEFAULT_APP_NAME = "Sajilogyaan";
/** Fallback logo when backend does not provide one (public asset) */
const DEFAULT_LOGO_PATH = "/logo/sglogo.png";

/**
 * Fetches public app settings (logo, appName, supportEmail) from system-status.
 * Use for dynamic branding across navbars, footer, and pages.
 */
export const useAppLogo = () => {
  const [logoUrl, setLogoUrl] = useState("");
  const [appName, setAppName] = useState(DEFAULT_APP_NAME);
  const [supportEmail, setSupportEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await apiFetchCandidates(["/public/system-status"], {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (data?.settings) {
          if (data.settings.appName) setAppName(data.settings.appName);
          if (data.settings.supportEmail) setSupportEmail(data.settings.supportEmail);
          if (data.settings.logo) {
            const logo = data.settings.logo;
            setLogoUrl(logo.startsWith("http") ? logo : `${API_HOST}${logo}`);
          }
        }
        if (data?.status?.appName && !data?.settings?.appName) setAppName(data.status.appName);

        if (!data?.settings?.logo) {
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
                setLogoUrl(logo.startsWith("http") ? logo : `${API_HOST}${logo}`);
              }
              if (settingsData?.settings?.appName) setAppName(settingsData.settings.appName);
              if (settingsData?.settings?.supportEmail) setSupportEmail(settingsData.settings.supportEmail || "");
            } catch {
              // ignore
            }
          }
        }
      } catch (error) {
        console.warn("Failed to load app settings:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { logoUrl: logoUrl || DEFAULT_LOGO_PATH, appName, supportEmail, loading };
};
