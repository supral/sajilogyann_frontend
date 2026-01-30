// src/pages/admin/ManageUsers.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import AdminSidebar from "./AdminSidebar";
import "../../styles/admin.css";

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

const normalizeRole = (r) => (r || "").toString().trim().toLowerCase();

/**
 * Tries multiple endpoints until one works.
 */
const apiFetchCandidates = async (paths, options = {}) => {
  let last = null;

  for (const prefix of API_PREFIXES) {
    for (const path of paths) {
      const url = `${API_HOST}${prefix}${path}`;
      try {
        const res = await fetch(url, options);
        const data = await safeJson(res);

        if (res.ok) return { res, data, url };

        // keep trying; store the last
        last = { res, data, url };
      } catch (e) {
        last = { error: e?.message || "Network error", url };
      }
    }
  }

  const msg =
    last?.data?.message ||
    last?.error ||
    `API not found. Last tried: ${last?.url || "unknown endpoint"}`;
  throw new Error(msg);
};

export default function ManageUsers() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("user");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");

  // edit modal
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);

  const token = getToken();

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const loadStudents = async () => {
    setErr("");
    setLoading(true);

    try {
      const candidates = [
        "/admin/users?role=student",
        "/admin/users",
      ];

      const { data } = await apiFetchCandidates(candidates, {
        method: "GET",
        headers: authHeaders,
      });

      const list = Array.isArray(data) ? data : data.users || data.data || data.results || [];

      const studentsOnly = list.filter((u) => normalizeRole(u.role) === "student");
      setUsers(studentsOnly);
    } catch (e) {
      setErr(e?.message || "Failed to load students");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => {
      const name = (u.name || u.fullName || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(s) || email.includes(s);
    });
  }, [q, users]);

  const openEdit = (u) => {
    setEditing(u);
    setEditForm({
      name: u.name || u.fullName || "",
      email: u.email || "",
      password: "",
    });
  };

  const saveEdit = async () => {
    if (!editing?._id && !editing?.id) return;

    const userId = editing._id || editing.id;
    setSaving(true);
    setErr("");

    try {
      // PATCH /admin/users/:id
      const candidates = [`/admin/users/${userId}`];

      const payload = {
        name: editForm.name,
        email: editForm.email,
        // optional password reset (only if typed)
        ...(editForm.password?.trim() ? { password: editForm.password.trim() } : {}),
      };

      const { data } = await apiFetchCandidates(candidates, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      const updated = data.user || data.updatedUser || data;

      // Update UI list
      setUsers((prev) =>
        prev.map((u) => ((u._id || u.id) === userId ? { ...u, ...updated } : u))
      );

      setEditing(null);
    } catch (e) {
      setErr(e?.message || "Failed to update student");
    } finally {
      setSaving(false);
    }
  };

  const deleteStudent = async (u) => {
    const userId = u._id || u.id;
    if (!userId) return;

    const ok = window.confirm(`Delete student "${u.name || u.email}"?`);
    if (!ok) return;

    setErr("");
    try {
      const candidates = [`/admin/users/${userId}`];

      await apiFetchCandidates(candidates, {
        method: "DELETE",
        headers: authHeaders,
      });

      setUsers((prev) => prev.filter((x) => (x._id || x.id) !== userId));
    } catch (e) {
      setErr(e?.message || "Failed to delete student");
    }
  };

  const goDetail = (u) => {
    const userId = u._id || u.id;
    if (!userId) return;
    // Pass state for instant display, but detail page will fetch fresh data too
    navigate(`/admin/user/${userId}`, { state: u });
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
          <div
            className="admin-page-header"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
          >
            <div>
              <h2 className="page-title" style={{ marginBottom: 4 }}>
                User Management (Students)
              </h2>
              <p style={{ marginTop: 0, opacity: 0.8 }}>Search, view, edit, and remove students.</p>
            </div>

            <button className="update-btn" onClick={loadStudents} disabled={loading}>
              ↻ Refresh
            </button>
          </div>

          {err ? (
            <div className="admin-card" style={{ borderLeft: "4px solid #ff4d4f" }}>
              <b>Error:</b> {err}
            </div>
          ) : null}

          <div className="admin-card">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search student..."
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #d9e2ff",
                outline: "none",
                fontSize: 16,
              }}
            />

            <div style={{ marginTop: 14, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr style={{ background: "#0b57ff", color: "#fff" }}>
                    <th style={{ textAlign: "left", padding: 14, borderTopLeftRadius: 10 }}>NAME</th>
                    <th style={{ textAlign: "left", padding: 14 }}>EMAIL</th>
                    <th style={{ textAlign: "left", padding: 14 }}>ROLE</th>
                    <th style={{ textAlign: "left", padding: 14, borderTopRightRadius: 10 }}>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} style={{ padding: 16 }}>Loading students…</td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: 16 }}>No students found.</td>
                    </tr>
                  ) : (
                    filtered.map((u) => {
                      const id = u._id || u.id;
                      return (
                        <tr
                          key={id}
                          style={{
                            borderBottom: "1px solid #e9efff",
                            cursor: "pointer",
                          }}
                          onClick={() => goDetail(u)}
                          title="Click to view details"
                        >
                          <td style={{ padding: 16 }}>{u.name || u.fullName || "-"}</td>
                          <td style={{ padding: 16 }}>{u.email || "-"}</td>
                          <td style={{ padding: 16, textTransform: "capitalize" }}>
                            {normalizeRole(u.role || "student")}
                          </td>
                          <td style={{ padding: 16 }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="update-btn"
                              style={{ padding: "8px 14px" }}
                              onClick={() => openEdit(u)}
                            >
                              Edit
                            </button>{" "}
                            <button
                              type="button"
                              className="delete-btn"
                              style={{ padding: "8px 14px" }}
                              onClick={() => deleteStudent(u)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <p style={{ marginTop: 12, opacity: 0.7 }}>
              Showing only users where <b>role = student</b>.
            </p>
          </div>
        </main>
      </div>

      {/* ✅ EDIT MODAL */}
      {editing ? (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Student</h3>

            <label style={{ display: "block", marginTop: 10 }}>Name</label>
            <input
              value={editForm.name}
              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Full name"
            />

            <label style={{ display: "block", marginTop: 10 }}>Email</label>
            <input
              value={editForm.email}
              onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="Email"
            />

            <label style={{ display: "block", marginTop: 10 }}>Reset Password (optional)</label>
            <input
              value={editForm.password}
              onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Leave empty to keep old password"
              type="password"
            />

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="update-btn" onClick={saveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button className="delete-btn" onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
