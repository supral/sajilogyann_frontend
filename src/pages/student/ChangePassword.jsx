import React, { useMemo, useState } from "react";
import StudentNavbar from "./StudentNavbar";
import NavbarAfterLogin from "../teacher/NavbarAfterLogin";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import "../../styles/auth.css";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_PREFIXES = ["/api/v1", "/api"];

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token =
    localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

  const role = useMemo(() => {
    try {
      const raw = localStorage.getItem("bs_user") || sessionStorage.getItem("bs_user");
      const user = raw ? JSON.parse(raw) : null;
      return (user?.role || "student").toString().trim().toLowerCase();
    } catch {
      return "student";
    }
  }, []);

  const Nav = role === "admin" ? Navbar : role === "teacher" ? NavbarAfterLogin : StudentNavbar;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword.trim()) {
      setError("Current password is required.");
      return;
    }
    if (newPassword.trim().length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from current password.");
      return;
    }

    if (!token) {
      setError("You must be logged in to change password.");
      return;
    }

    setLoading(true);
    try {
      let lastErr = null;
      for (const prefix of API_PREFIXES) {
        const res = await fetch(`${API_HOST}${prefix}/auth/change-password`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword: currentPassword.trim(),
            newPassword: newPassword.trim(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setSuccess(data.message || "Password changed successfully.");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setLoading(false);
          return;
        }
        lastErr = data.message || res.statusText || "Failed to change password";
      }
      setError(lastErr || "Failed to change password.");
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Nav />
      <div className="auth-container-new" style={{ minHeight: "80vh", paddingTop: 40, paddingBottom: 40 }}>
        <div
          style={{
            width: "100%",
            maxWidth: 440,
            margin: "0 auto",
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
            padding: 32,
          }}
        >
          <h2 style={{ margin: "0 0 8px 0", fontSize: 24, fontWeight: 800, color: "#0f172a" }}>
            Change Password
          </h2>
          <p style={{ margin: "0 0 24px 0", fontSize: 14, color: "#64748b" }}>
            Enter your current password and choose a new one.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label htmlFor="currentPassword" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 600, color: "#334155" }}>
                Current password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: 15,
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label htmlFor="newPassword" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 600, color: "#334155" }}>
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: 15,
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 600, color: "#334155" }}>
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: 15,
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {error ? (
              <p style={{ margin: 0, fontSize: 14, color: "#dc2626" }}>{error}</p>
            ) : null}
            {success ? (
              <p style={{ margin: 0, fontSize: 14, color: "#16a34a" }}>{success}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "14px 20px",
                fontSize: 15,
                fontWeight: 700,
                color: "#fff",
                background: loading ? "#94a3b8" : "#2563eb",
                border: "none",
                borderRadius: 12,
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: 8,
              }}
            >
              {loading ? "Updating…" : "Change password"}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ChangePassword;
