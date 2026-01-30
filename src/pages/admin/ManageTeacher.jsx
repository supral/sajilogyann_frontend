import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import AdminSidebar from "./AdminSidebar";

import "../../styles/admin.css";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_BASE_URL = `${API_HOST}/api`;

// token getter (localStorage/sessionStorage)
const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

async function apiRequest(path, { method = "GET", body } = {}) {
  const token = getToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : null;

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

const ManageTeacher = () => {
  const navigate = useNavigate();

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ✅ active section for sidebar highlight
  const [activeSection, setActiveSection] = useState("teacher");

  // Data
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [toast, setToast] = useState("");

  // Edit
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({
    name: "",
    dept: "",
    contact: "",
    password: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Add
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    name: "",
    email: "",
    dept: "",
    contact: "",
    password: "",
  });
  const [savingAdd, setSavingAdd] = useState(false);

  // ✅ prevent autofill focus weirdness
  const searchRef = useRef(null);

  // Normalize API list response
  const normalizeList = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;

    if (Array.isArray(data.teachers)) return data.teachers;
    if (Array.isArray(data.users)) return data.users;
    if (Array.isArray(data.data)) return data.data;

    if (Array.isArray(data?.data?.teachers)) return data.data.teachers;
    if (Array.isArray(data?.data?.users)) return data.data.users;

    return [];
  };

  // Load Teachers
  const loadTeachers = async () => {
    setLoading(true);
    setPageError("");

    try {
      const data = await apiRequest("/admin/teachers", { method: "GET" });
      const list = normalizeList(data);

      const onlyTeachers = list.filter(
        (u) => (u?.role || "").toLowerCase() === "teacher"
      );

      setTeachers(
        onlyTeachers.map((t) => ({
          ...t,
          _id: t?._id || t?.id,
        }))
      );
    } catch (err) {
      setTeachers([]);
      setPageError(err.message || "Failed to load teachers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();

    // Optional: clear any browser autofill that happens immediately on mount
    const t = setTimeout(() => {
      setSearch("");
      if (searchRef.current) searchRef.current.value = "";
    }, 0);

    return () => clearTimeout(t);
  }, []);

  // Search filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;

    return teachers.filter((t) => {
      const name = (t?.name || "").toLowerCase();
      const email = (t?.email || "").toLowerCase();
      const dept = (t?.department || t?.dept || "").toLowerCase();
      const phone = (t?.phone || t?.contact || "").toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        dept.includes(q) ||
        phone.includes(q)
      );
    });
  }, [teachers, search]);

  // ✅ Sidebar routing for shared sidebar
  const handleMenuClick = (secId) => {
    setActiveSection(secId);

    if (secId === "teacher") return; // already here
    if (secId === "course") return navigate("/admin/courses");
    if (secId === "quiz") return navigate("/admin/quizzes");
    if (secId === "case") return navigate("/admin/casestudies");
    if (secId === "transactions") return navigate("/admin/transactions");
    if (secId === "analytics") return navigate("/admin/analytics");

    // dashboard/user/settings -> main admin
    return navigate("/admin");
  };

  // Toast helper
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  // ADD Teacher
  const handleAddTeacher = async () => {
    const { name, email, dept, contact, password } = newTeacher;

    if (!name || !email || !dept || !contact || !password) {
      alert("All fields are required");
      return;
    }

    setSavingAdd(true);
    try {
      await apiRequest("/admin/teachers", {
        method: "POST",
        body: {
          name,
          email,
          password,
          phone: contact,
          department: dept,
          role: "teacher",
        },
      });

      setIsAddModalOpen(false);
      setNewTeacher({ name: "", email: "", dept: "", contact: "", password: "" });

      await loadTeachers();
      showToast("✅ Teacher added");
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingAdd(false);
    }
  };

  // EDIT Teacher (open modal)
  const startEdit = (t) => {
    setEditing(t);
    setEditData({
      name: t?.name || "",
      dept: t?.department || t?.dept || "",
      contact: t?.phone || t?.contact || "",
      password: "",
    });
  };

  // EDIT Teacher (save changes)
  const saveEdit = async () => {
    const id = editing?._id;
    if (!id) {
      alert("Teacher ID not found");
      return;
    }

    if (!editData.name || !editData.dept || !editData.contact) {
      alert("Name, Department, and Contact are required");
      return;
    }

    const payload = {
      name: editData.name.trim(),
      phone: editData.contact.trim(),
      department: editData.dept.trim(),
    };

    if (editData.password && editData.password.trim().length > 0) {
      payload.password = editData.password.trim();
    }

    setSavingEdit(true);

    const prev = teachers;
    setTeachers((cur) =>
      cur.map((t) => (t._id === id ? { ...t, ...payload } : t))
    );

    try {
      await apiRequest(`/admin/teachers/${id}`, {
        method: "PUT",
        body: payload,
      });

      setEditing(null);
      showToast("✅ Teacher updated");
      await loadTeachers();
    } catch (err) {
      setTeachers(prev);
      alert(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // DELETE Teacher
  const removeTeacher = async (id) => {
    if (!id) return alert("Teacher ID not found");
    if (!window.confirm("Delete this teacher?")) return;

    const prev = teachers;
    setTeachers((cur) => cur.filter((t) => t._id !== id));

    try {
      await apiRequest(`/admin/teachers/${id}`, { method: "DELETE" });
      showToast("🗑️ Teacher deleted");
      await loadTeachers();
    } catch (err) {
      setTeachers(prev);
      alert(err.message);
    }
  };

  return (
    <div className={`admin-layout ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <Navbar />

      {/* toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 80,
            right: 20,
            padding: "10px 14px",
            background: "#111827",
            color: "#fff",
            borderRadius: 10,
            zIndex: 9999,
            fontSize: 14,
          }}
        >
          {toast}
        </div>
      )}

      <div className="admin-container">
        {/* ✅ SHARED SIDEBAR (NO INLINE ASIDE) */}
        <AdminSidebar
          activeSection={activeSection}
          setActiveSection={handleMenuClick}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {/* MAIN */}
        <main className="admin-main">
          <div className="page-header-row">
            <h1 className="page-title">Teacher Management</h1>
            <button className="update-btn" onClick={() => setIsAddModalOpen(true)}>
              + Add Teacher
            </button>
          </div>

          {/* AUTOFILL FIX */}
          <form autoComplete="off">
            <input
              ref={searchRef}
              className="search-bar"
              type="search"
              inputMode="search"
              name="search_teachers_no_autofill"
              autoComplete="new-password"
              placeholder="🔍 Search by name, email, department, contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          {pageError && (
            <div style={{ marginTop: 12, padding: 10, background: "#ffe6e6", borderRadius: 8 }}>
              <strong>Error:</strong> {pageError}
              <div style={{ marginTop: 8 }}>
                <button className="update-btn" onClick={loadTeachers}>
                  Retry
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <p style={{ marginTop: 12 }}>Loading teachers...</p>
          ) : (
            <table className="user-table">
              <thead>
                <tr>
                  <th>FULL NAME</th>
                  <th>EMAIL</th>
                  <th>DEPARTMENT</th>
                  <th>CONTACT</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length ? (
                  filtered.map((t) => (
                    <tr key={t._id}>
                      <td>{t.name || "-"}</td>
                      <td>{t.email || "-"}</td>
                      <td>{t.department || t.dept || "-"}</td>
                      <td>{t.phone || t.contact || "-"}</td>
                      <td style={{ display: "flex", gap: 8 }}>
                        <button className="edit-btn" onClick={() => startEdit(t)}>
                          Edit
                        </button>
                        <button className="delete-btn" onClick={() => removeTeacher(t._id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "1rem" }}>
                      No teachers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </main>
      </div>

      {/* ADD MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add Teacher</h3>

            <input
              placeholder="Full Name"
              value={newTeacher.name}
              onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
              autoComplete="off"
            />
            <input
              placeholder="Email"
              value={newTeacher.email}
              onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
              autoComplete="off"
            />
            <input
              placeholder="Department"
              value={newTeacher.dept}
              onChange={(e) => setNewTeacher({ ...newTeacher, dept: e.target.value })}
              autoComplete="off"
            />
            <input
              placeholder="Contact"
              value={newTeacher.contact}
              onChange={(e) => setNewTeacher({ ...newTeacher, contact: e.target.value })}
              autoComplete="off"
            />
            <input
              type="password"
              placeholder="Password"
              value={newTeacher.password}
              onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
              autoComplete="new-password"
            />

            <div className="modal-actions">
              <button className="update-btn" onClick={handleAddTeacher} disabled={savingAdd}>
                {savingAdd ? "Saving..." : "Save"}
              </button>
              <button className="delete-btn" onClick={() => setIsAddModalOpen(false)} disabled={savingAdd}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editing && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Teacher</h3>

            <input
              placeholder="Full Name"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              autoComplete="off"
            />
            <input
              placeholder="Department"
              value={editData.dept}
              onChange={(e) => setEditData({ ...editData, dept: e.target.value })}
              autoComplete="off"
            />
            <input
              placeholder="Contact"
              value={editData.contact}
              onChange={(e) => setEditData({ ...editData, contact: e.target.value })}
              autoComplete="off"
            />

            <input
              type="password"
              placeholder="Reset Password (optional)"
              value={editData.password}
              onChange={(e) => setEditData({ ...editData, password: e.target.value })}
              autoComplete="new-password"
            />

            <div className="modal-actions">
              <button className="update-btn" onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save"}
              </button>
              <button className="delete-btn" onClick={() => setEditing(null)} disabled={savingEdit}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTeacher;
