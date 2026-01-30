import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import AdminSidebar from "./AdminSidebar";
import "../../styles/admin.css";
import "../../styles/admin-settings.css";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_PREFIXES = ["/api", "/api/v1"];

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

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
        if (res.ok) return { data, url, res };
        last = { data, url, res };
      } catch (e) {
        last = { error: e?.message || "Network error", url };
      }
    }
  }
  throw new Error(
    last?.data?.message || last?.error || `API error. Last: ${last?.url}`
  );
};

const clampNum = (val, min, max) => {
  const n = Number(val);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
};

// ✅ one-time auto-off key
const AUTO_OFF_KEY = "bs_auto_off_maintenance_on_reload";

export default function AdminSettings() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("settings");

  const token = getToken();
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [showMaintenancePassword, setShowMaintenancePassword] = useState(false);
  const [maintenancePassword, setMaintenancePassword] = useState("");

  // ✅ Fully dynamic - initialize with null/empty values, will be populated from backend
  const [form, setForm] = useState({
    appName: "",
    supportEmail: "",
    logo: "",

    maintenanceMode: false,
    registrationEnabled: true,

    mcqMaxAttempts: 3,
    mcqPassMark: 50,
    requirePaymentAfterFail: true,

    certificateMinPercent: 75,

    khaltiEnabled: false,
    khaltiPublicKey: "",
    khaltiSecretKey: "",
  });

  const [logoPreview, setLogoPreview] = useState("");
  const [logoFile, setLogoFile] = useState(null);

  // ✅ Track if settings have been loaded at least once
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const loadSettings = async () => {
    setErr("");
    setSuccess("");
    setLoading(true);
    try {
      const { data } = await apiFetchCandidates([`/admin/settings`], {
        method: "GET",
        headers,
      });

      if (data?.settings) {
        // ✅ Fully dynamic - merge all settings from backend
        const loadedSettings = {
          appName: data.settings.appName || "",
          supportEmail: data.settings.supportEmail || "",
          logo: data.settings.logo || "",
          
          maintenanceMode: !!data.settings.maintenanceMode,
          registrationEnabled: data.settings.registrationEnabled !== undefined 
            ? !!data.settings.registrationEnabled 
            : true,
          
          mcqMaxAttempts: Number(data.settings.mcqMaxAttempts) || 3,
          mcqPassMark: Number(data.settings.mcqPassMark) || 50,
          requirePaymentAfterFail: data.settings.requirePaymentAfterFail !== undefined
            ? !!data.settings.requirePaymentAfterFail
            : true,
          
          certificateMinPercent: Number(data.settings.certificateMinPercent) || 75,
          
          khaltiEnabled: !!data.settings.khaltiEnabled,
          khaltiPublicKey: data.settings.khaltiPublicKey || "",
          khaltiSecretKey: data.settings.khaltiSecretKey || "",
        };
        
        setForm(loadedSettings);
        
        // Set logo preview if logo exists
        if (loadedSettings.logo) {
          const logoUrl = loadedSettings.logo.startsWith("http") 
            ? loadedSettings.logo 
            : `${API_HOST}${loadedSettings.logo}`;
          setLogoPreview(logoUrl);
        } else {
          setLogoPreview("");
        }
        
        setSettingsLoaded(true);
      } else {
        setErr("No settings data received from server");
      }
    } catch (e) {
      setErr(e?.message || "Failed to load settings");
      console.error("Error loading settings:", e);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: auto turn off maintenance after reload (one-time)
  const autoOffMaintenanceIfNeeded = async () => {
    const flag = localStorage.getItem(AUTO_OFF_KEY);
    if (flag !== "1") return;

    try {
      await apiFetchCandidates([`/admin/settings`], {
        method: "PATCH",
        headers,
        body: JSON.stringify({ maintenanceMode: false }),
      });
    } catch {
      // if backend unreachable, still avoid infinite loop
    } finally {
      localStorage.removeItem(AUTO_OFF_KEY);
    }
  };

  useEffect(() => {
    (async () => {
      await autoOffMaintenanceIfNeeded(); // ✅ first safety
      await loadSettings(); // ✅ then load settings
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    // ✅ Handle logo file upload
    if (name === "logo" && files && files[0]) {
      const file = files[0];
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
      return;
    }
    
    // ✅ Handle maintenance mode toggle - show password prompt when enabling
    if (name === "maintenanceMode") {
      if (checked === true && !form.maintenanceMode) {
        // Enabling maintenance - show password prompt
        setShowMaintenancePassword(true);
        setMaintenancePassword("");
        // Don't update form yet - wait for password confirmation
        return;
      } else if (checked === false) {
        // Disabling maintenance - hide password prompt and update immediately
        setShowMaintenancePassword(false);
        setMaintenancePassword("");
        setForm((p) => ({
          ...p,
          [name]: false,
        }));
        return;
      }
    }
    
    setForm((p) => ({
      ...p,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onSave = async () => {
    setErr("");
    setSuccess("");
    
    // ✅ If password prompt is shown and enabling maintenance, require password
    if (showMaintenancePassword && !maintenancePassword) {
      setErr("Password required to enable maintenance mode");
      return;
    }

    setSaving(true);

    try {
      // ✅ Use FormData if logo file is being uploaded
      const formData = new FormData();
      
      // ✅ Add logo file if selected
      if (logoFile) {
        formData.append("logo", logoFile);
      }

      // ✅ Add all other fields
      formData.append("appName", String(form.appName || "").trim());
      formData.append("supportEmail", String(form.supportEmail || "").trim());
      
      formData.append("maintenanceMode", !!form.maintenanceMode);
      formData.append("registrationEnabled", !!form.registrationEnabled);
      
      formData.append("mcqMaxAttempts", clampNum(form.mcqMaxAttempts, 1, 10));
      formData.append("mcqPassMark", clampNum(form.mcqPassMark, 0, 100));
      formData.append("requirePaymentAfterFail", !!form.requirePaymentAfterFail);
      
      formData.append("certificateMinPercent", clampNum(form.certificateMinPercent, 0, 100));
      
      formData.append("khaltiEnabled", !!form.khaltiEnabled);
      formData.append("khaltiPublicKey", String(form.khaltiPublicKey || "").trim());
      formData.append("khaltiSecretKey", String(form.khaltiSecretKey || "").trim());

      // ✅ Add password if enabling maintenance mode (when password prompt is shown)
      if (showMaintenancePassword && maintenancePassword) {
        formData.append("maintenanceMode", true); // Ensure it's enabled
        formData.append("maintenancePassword", maintenancePassword);
      }

      // ✅ If enabling maintenance, mark to auto-disable on next reload
      if (form.maintenanceMode === true || (showMaintenancePassword && maintenancePassword)) {
        localStorage.setItem(AUTO_OFF_KEY, "1");
      } else {
        localStorage.removeItem(AUTO_OFF_KEY);
      }

      // ✅ Create headers without Content-Type (let browser set it for FormData)
      const formHeaders = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const { data, res } = await apiFetchCandidates([`/admin/settings`], {
        method: "PATCH",
        headers: formHeaders,
        body: formData,
      });

      // ✅ Handle password requirement response
      if (res?.status === 400 && data?.requiresPassword) {
        setErr(data.message || "Password required to enable maintenance mode");
        setShowMaintenancePassword(true);
        setSaving(false);
        return;
      }

      if (res?.status === 401 && data?.requiresPassword) {
        setErr(data.message || "Invalid password");
        setMaintenancePassword("");
        setSaving(false);
        return;
      }

      if (data?.settings) {
        // ✅ Fully dynamic - update form with saved settings from backend
        const savedSettings = {
          appName: data.settings.appName || "",
          supportEmail: data.settings.supportEmail || "",
          logo: data.settings.logo || "",
          
          maintenanceMode: !!data.settings.maintenanceMode,
          registrationEnabled: !!data.settings.registrationEnabled,
          
          mcqMaxAttempts: Number(data.settings.mcqMaxAttempts) || 3,
          mcqPassMark: Number(data.settings.mcqPassMark) || 50,
          requirePaymentAfterFail: !!data.settings.requirePaymentAfterFail,
          
          certificateMinPercent: Number(data.settings.certificateMinPercent) || 75,
          
          khaltiEnabled: !!data.settings.khaltiEnabled,
          khaltiPublicKey: data.settings.khaltiPublicKey || "",
          khaltiSecretKey: data.settings.khaltiSecretKey || "",
        };
        
        setForm(savedSettings);
        
        // Update logo preview
        if (savedSettings.logo) {
          const logoUrl = savedSettings.logo.startsWith("http") 
            ? savedSettings.logo 
            : `${API_HOST}${savedSettings.logo}`;
          setLogoPreview(logoUrl);
        }
        setLogoFile(null); // Clear file input after save
        
        setShowMaintenancePassword(false);
        setMaintenancePassword("");
        setSuccess("Settings updated successfully ✅" + (savedSettings.maintenanceMode ? " System is now in maintenance mode." : ""));
      } else {
        setErr("No settings data received after save");
      }
    } catch (e) {
      const errorData = e?.response?.data || {};
      if (errorData.requiresPassword) {
        setErr(errorData.message || "Password required to enable maintenance mode");
        setShowMaintenancePassword(true);
      } else {
        setErr(e?.message || "Failed to save settings");
      }
      console.error("Error saving settings:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`admin-layout ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <Navbar />

      <div className="admin-container">
        <AdminSidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <main className="admin-main">
          <div className="settings-header">
            <div>
              <h1 className="settings-title">Settings</h1>
              <p className="settings-subtitle">
                Manage global rules, system features, certificates and payment options.
              </p>

              {/* ✅ shows your requested behavior clearly */}
              <p className="settings-subtitle" style={{ opacity: 0.85 }}>
                ✅ Maintenance will auto turn OFF after page reload (safety feature).
              </p>
            </div>

            <div className="settings-actions">
              <button className="btn-outline" onClick={loadSettings} disabled={loading || saving}>
                ⟳ Reload
              </button>
              <button className="btn-primary" onClick={onSave} disabled={loading || saving}>
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>

          {err ? (
            <div className="settings-alert settings-alert-error">
              <strong>Error:</strong> {err}
            </div>
          ) : null}

          {success ? (
            <div className="settings-alert settings-alert-success">
              <strong>{success}</strong>
            </div>
          ) : null}

          {loading && !settingsLoaded ? (
            <div className="settings-loading" style={{ 
              textAlign: "center", 
              padding: "3rem",
              fontSize: "1.1rem",
              color: "#64748b"
            }}>
              <p>Loading settings from server...</p>
            </div>
          ) : (
            <div className="settings-grid">
            {/* BRANDING */}
            <section className="settings-card">
              <div className="card-head">
                <h2>Branding</h2>
                <span className="chip">Global</span>
              </div>

              <div className="field">
                <label>App Name</label>
                <input
                  name="appName"
                  type="text"
                  value={form.appName ?? ""}
                  onChange={onChange}
                  placeholder="e.g., Sajilo Gyann"
                  disabled={loading || saving}
                />
              </div>

              <div className="field">
                <label>Support Email</label>
                <input
                  name="supportEmail"
                  type="email"
                  value={form.supportEmail ?? ""}
                  onChange={onChange}
                  placeholder="support@example.com"
                  disabled={loading || saving}
                />
              </div>

              <div className="field">
                <label>Logo</label>
                <div style={{ marginBottom: "12px" }}>
                  {logoPreview && (
                    <div style={{ 
                      marginBottom: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px"
                    }}>
                      <img
                        src={logoPreview}
                        alt="Logo Preview"
                        style={{
                          maxWidth: "120px",
                          maxHeight: "60px",
                          objectFit: "contain",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          padding: "8px",
                          background: "#fff",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setLogoPreview("");
                          setLogoFile(null);
                          setForm((p) => ({ ...p, logo: "" }));
                        }}
                        style={{
                          padding: "6px 12px",
                          background: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                          fontWeight: 600,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    name="logo"
                    accept="image/*"
                    onChange={onChange}
                    disabled={loading || saving}
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.95rem",
                    }}
                  />
                </div>
                <div className="hint" style={{ marginTop: "8px" }}>
                  Upload a logo image (PNG, JPG, SVG). Recommended size: 200x60px or similar aspect ratio.
                  <br />
                  This logo will be displayed in the navigation bar across the entire application.
                </div>
              </div>

              <div className="hint">
                Tip: App Name can be displayed on certificates, emails, and headers.
              </div>
            </section>

            {/* SYSTEM TOGGLES */}
            <section className="settings-card">
              <div className="card-head">
                <h2>System Toggles</h2>
                <span className="chip">Controls access</span>
              </div>

              <div className="toggle-row">
                <div>
                  <div className="toggle-title">Maintenance Mode</div>
                  <div className="toggle-desc">
                    Temporarily disable the website for users. Admin users will still have access.
                    <br />
                    <b>Auto-off:</b> Will automatically turn OFF after reload.
                    <br />
                    <b>⚠️ Warning:</b> Enabling maintenance mode requires admin password confirmation.
                  </div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    name="maintenanceMode"
                    checked={!!form.maintenanceMode || showMaintenancePassword}
                    onChange={onChange}
                    disabled={loading || saving || showMaintenancePassword}
                  />
                  <span className="slider" />
                </label>
              </div>

              {/* ✅ Password Prompt for Maintenance Mode */}
              {showMaintenancePassword && (
                <div className="field" style={{ 
                  marginTop: "16px", 
                  padding: "16px", 
                  background: "#fef3c7", 
                  border: "1px solid #fbbf24",
                  borderRadius: "8px" 
                }}>
                  <label style={{ fontWeight: 700, color: "#92400e", marginBottom: "8px" }}>
                    🔒 Admin Password Required
                  </label>
                  <p style={{ fontSize: "0.9rem", color: "#78350f", marginBottom: "12px" }}>
                    Enter your admin password to enable maintenance mode. This will block all users except admins.
                  </p>
                  <input
                    type="password"
                    value={maintenancePassword}
                    onChange={(e) => setMaintenancePassword(e.target.value)}
                    placeholder="Enter admin password"
                    disabled={loading || saving}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "1rem",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !saving) {
                        onSave();
                      }
                    }}
                  />
                  <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMaintenancePassword(false);
                        setMaintenancePassword("");
                        setForm((p) => ({ ...p, maintenanceMode: false }));
                      }}
                      disabled={saving}
                      style={{
                        padding: "8px 16px",
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: saving ? "not-allowed" : "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={onSave}
                      disabled={saving || !maintenancePassword}
                      style={{
                        padding: "8px 16px",
                        background: maintenancePassword && !saving ? "#10b981" : "#9ca3af",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: maintenancePassword && !saving ? "pointer" : "not-allowed",
                        fontWeight: 600,
                      }}
                    >
                      {saving ? "Enabling..." : "Confirm & Enable"}
                    </button>
                  </div>
                </div>
              )}

              <div className="divider" />

              <div className="toggle-row">
                <div>
                  <div className="toggle-title">Registration Enabled</div>
                  <div className="toggle-desc">Allow new users to register.</div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    name="registrationEnabled"
                    checked={!!form.registrationEnabled}
                    onChange={onChange}
                    disabled={loading || saving}
                  />
                  <span className="slider" />
                </label>
              </div>
            </section>

            {/* MCQ RULES */}
            <section className="settings-card">
              <div className="card-head">
                <h2>MCQ Rules</h2>
                <span className="chip">Global quiz policy</span>
              </div>

              <div className="two-col">
                <div className="field">
                  <label>Max Attempts</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    name="mcqMaxAttempts"
                    value={form.mcqMaxAttempts ?? 3}
                    onChange={onChange}
                    disabled={loading || saving}
                  />
                </div>

                <div className="field">
                  <label>Pass Mark (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    name="mcqPassMark"
                    value={form.mcqPassMark ?? 50}
                    onChange={onChange}
                    disabled={loading || saving}
                  />
                </div>
              </div>

              <div className="toggle-row" style={{ marginTop: 6 }}>
                <div>
                  <div className="toggle-title">Require Payment After Fail</div>
                  <div className="toggle-desc">
                    If student fails after max attempts, payment required to continue.
                  </div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    name="requirePaymentAfterFail"
                    checked={!!form.requirePaymentAfterFail}
                    onChange={onChange}
                    disabled={loading || saving}
                  />
                  <span className="slider" />
                </label>
              </div>
            </section>

            {/* CERTIFICATES */}
            <section className="settings-card">
              <div className="card-head">
                <h2>Certificates</h2>
                <span className="chip">Completion</span>
              </div>

              <div className="field">
                <label>Minimum % for Certificate</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  name="certificateMinPercent"
                  value={form.certificateMinPercent ?? 75}
                  onChange={onChange}
                  disabled={loading || saving}
                />
              </div>
            </section>

            {/* KHALTI */}
            <section className="settings-card settings-card-wide">
              <div className="card-head">
                <h2>Payment (Khalti)</h2>
                <span className="chip">Billing</span>
              </div>

              <div className="toggle-row">
                <div>
                  <div className="toggle-title">Enable Khalti</div>
                  <div className="toggle-desc">Enable payment features.</div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    name="khaltiEnabled"
                    checked={!!form.khaltiEnabled}
                    onChange={onChange}
                    disabled={loading || saving}
                  />
                  <span className="slider" />
                </label>
              </div>

              <div className="divider" />

              <div className="two-col">
                <div className="field">
                  <label>Khalti Public Key</label>
                  <input
                    name="khaltiPublicKey"
                    type="text"
                    value={form.khaltiPublicKey ?? ""}
                    onChange={onChange}
                    placeholder="test_public_key_..."
                    disabled={loading || saving || !form.khaltiEnabled}
                  />
                </div>

                <div className="field">
                  <label>Khalti Secret Key</label>
                  <input
                    name="khaltiSecretKey"
                    type="password"
                    value={form.khaltiSecretKey ?? ""}
                    onChange={onChange}
                    placeholder="test_secret_key_..."
                    disabled={loading || saving || !form.khaltiEnabled}
                  />
                </div>
              </div>

              <div className="hint">
                Security note: In production, keep secret key in backend ENV only.
              </div>
            </section>
          </div>
          )}
        </main>
      </div>
    </div>
  );
}
