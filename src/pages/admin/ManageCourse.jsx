// src/pages/admin/ManageCourse.jsx
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

/**
 * Try multiple endpoints until one works.
 */
const apiFetchCandidates = async (paths, options = {}) => {
  let last = null;

  for (const prefix of API_PREFIXES) {
    for (const p of paths) {
      const url = `${API_HOST}${prefix}${p}`;
      try {
        const res = await fetch(url, options);
        const data = await safeJson(res);

        if (res.ok) return { res, data, url };
        last = { res, data, url };
      } catch (e) {
        last = { error: e?.message || "Network error", url };
      }
    }
  }

  throw new Error(
    last?.data?.message ||
      last?.error ||
      `API not found. Last tried: ${last?.url || "unknown endpoint"}`
  );
};

const normalizeCourse = (c) => {
  // Support multiple backend shapes safely
  const id = c._id || c.id;

  const teacherObj =
    typeof c.teacherId === "object" && c.teacherId !== null ? c.teacherId : null;

  return {
    _id: id,
    name: c.name || c.title || "",
    category: c.category || "",
    duration: c.duration || "",
    level: c.level || c.meta?.level || "",
    status: c.status || c.meta?.status || "",
    teacherId: teacherObj?._id || c.teacherId || c.teacher || "",
    teacherName: teacherObj?.name || c.teacherName || c.teacher || "",
    createdAt: c.createdAt || null,
  };
};

const ManageCourse = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("course");

  const token = getToken();

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  // Dynamic teacher list
  const [teachers, setTeachers] = useState([]);

  // Dynamic course list
  const [courses, setCourses] = useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Edit existing course
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({
    name: "",
    category: "",
    duration: "",
    level: "",
    status: "",
    teacherId: "",
  });

  // Add new course
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: "",
    category: "",
    duration: "",
    level: "",
    status: "Free",
    teacherId: "",
  });

  // ✅ Sidebar routing
  const handleMenuClick = (secId) => {
    setActiveSection(secId);

    if (secId === "course") return; // already here
    if (secId === "teacher") return navigate("/admin/teachers");
    if (secId === "quiz") return navigate("/admin/quizzes");
    if (secId === "case") return navigate("/admin/casestudies");
    if (secId === "analytics") return navigate("/admin/analytics");

    return navigate("/admin-dashboard");
  };

  const loadTeachers = async () => {
    const { data } = await apiFetchCandidates(["/admin/teachers"], {
      method: "GET",
      headers: authHeaders,
    });

    const list = Array.isArray(data)
      ? data
      : data.teachers || data.users || data.data || [];

    setTeachers(list);
  };

  const loadCourses = async () => {
    const { data } = await apiFetchCandidates(["/admin/courses"], {
      method: "GET",
      headers: authHeaders,
    });

    const list = Array.isArray(data)
      ? data
      : data.courses || data.data || data.results || [];

    setCourses(list.map(normalizeCourse));
  };

  const refreshAll = async () => {
    setErr("");
    setLoading(true);
    try {
      await Promise.all([loadTeachers(), loadCourses()]);
    } catch (e) {
      setErr(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return courses;

    return courses.filter((c) => {
      return (
        (c.name || "").toLowerCase().includes(term) ||
        (c.category || "").toLowerCase().includes(term) ||
        (c.level || "").toLowerCase().includes(term) ||
        (c.status || "").toLowerCase().includes(term) ||
        (c.teacherName || "").toLowerCase().includes(term)
      );
    });
  }, [courses, search]);

  // ✅ row click -> course detail page
  const goToCourseDetail = (course) => {
    const id = course?._id;
    if (!id) return;
    // Use state so course detail can instantly show basic info while fetching full detail
    navigate(`/admin/courses/${id}`, { state: { course } });
  };

  // ===== Edit handlers =====
  const startEdit = (course) => {
    setEditing(course);
    setEditData({
      name: course.name,
      category: course.category,
      duration: course.duration,
      level: course.level || "",
      status: course.status || "",
      teacherId: course.teacherId || "",
    });
  };

  const saveEdit = async () => {
    if (!editing?._id) return;

    setErr("");
    try {
      const payload = {
        title: editData.name,
        name: editData.name,
        category: editData.category,
        duration: editData.duration,
        teacherId: editData.teacherId,
        meta: {
          level: editData.level,
          status: editData.status,
        },
        level: editData.level,
        status: editData.status,
      };

      const { data } = await apiFetchCandidates(
        [`/admin/courses/${editing._id}`],
        {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify(payload),
        }
      );

      const updated = normalizeCourse(data.course || data);

      setCourses((prev) =>
        prev.map((c) => (c._id === editing._id ? updated : c))
      );

      setEditing(null);
    } catch (e) {
      setErr(e?.message || "Failed to update course");
    }
  };

  const removeCourse = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this course?")) return;

    setErr("");
    try {
      await apiFetchCandidates([`/admin/courses/${id}`], {
        method: "DELETE",
        headers: authHeaders,
      });

      setCourses((prev) => prev.filter((c) => c._id !== id));
    } catch (e) {
      setErr(e?.message || "Failed to delete course");
    }
  };

  // ===== Add course handlers =====
  const handleNewChange = (e) => {
    const { name, value } = e.target;
    setNewCourse((prev) => ({ ...prev, [name]: value }));
  };

  const resetNewCourse = () => {
    setNewCourse({
      name: "",
      category: "",
      duration: "",
      level: "",
      status: "Free",
      teacherId: "",
    });
  };

  const handleAddCourse = async () => {
    const { name, category, duration, teacherId } = newCourse;

    if (!name || !category || !duration || !teacherId) {
      setErr("Please fill all required fields (Name, Category, Duration, Teacher).");
      return;
    }

    setErr("");
    try {
      const payload = {
        title: name,
        name,
        category,
        duration,
        teacherId,
        meta: {
          level: newCourse.level,
          status: newCourse.status,
        },
        level: newCourse.level,
        status: newCourse.status,
      };

      const { data } = await apiFetchCandidates(["/admin/courses"], {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      const created = normalizeCourse(data.course || data);

      setCourses((prev) => [created, ...prev]);

      resetNewCourse();
      setIsAddModalOpen(false);
    } catch (e) {
      setErr(e?.message || "Failed to add course");
    }
  };

  const teacherOptions = useMemo(() => {
    return teachers.map((t) => ({
      value: t._id,
      label: `${t.name}${t.email ? ` (${t.email})` : ""}`,
    }));
  }, [teachers]);

  const getTeacherNameById = (id) => {
    const found = teachers.find((t) => t._id === id);
    return found?.name || "";
  };

  return (
    <div className={`admin-layout ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <Navbar />

      <div className="admin-container">
        <AdminSidebar
          activeSection={activeSection}
          setActiveSection={(secId) => handleMenuClick(secId)}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <main className="admin-main">
          <div className="page-header-row" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h1 className="page-title">Course Management</h1>
              <div style={{ opacity: 0.75 }}>
                {loading ? "Loading..." : "All courses are loaded from database."}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="update-btn" onClick={refreshAll} disabled={loading}>
                ↻ Refresh
              </button>
              <button className="update-btn" onClick={() => setIsAddModalOpen(true)}>
                + Add Course
              </button>
            </div>
          </div>

          {err ? (
            <div className="admin-card" style={{ borderLeft: "4px solid #ff4d4f", marginTop: 12 }}>
              <b>Error:</b> {err}
            </div>
          ) : null}

          <div className="search-bar-container" style={{ marginTop: 12 }}>
            <input
              type="text"
              className="search-bar"
              placeholder="🔍 Search by course, category, teacher, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <table className="user-table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>COURSE NAME</th>
                <th>CATEGORY</th>
                <th>DURATION</th>
                <th>LEVEL</th>
                <th>STATUS</th>
                <th>TEACHER</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "1rem" }}>
                    Loading courses...
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((c) => (
                  <tr
                    key={c._id}
                    style={{ cursor: "default" }}
                  >
                    <td style={{ fontWeight: 700 }}>
                      {c.name}
                    </td>
                    <td>{c.category}</td>
                    <td>{c.duration}</td>
                    <td>{c.level || "-"}</td>
                    <td>{c.status || "-"}</td>
                    <td>{c.teacherName || getTeacherNameById(c.teacherId) || "-"}</td>

                    {/* ✅ prevent row click when pressing buttons */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "nowrap" }}>
                        <button 
                          onClick={() => goToCourseDetail(c)}
                          style={{
                            background: "#e0f2fe",
                            color: "#0369a1",
                            border: "none",
                            padding: "6px 10px",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            whiteSpace: "nowrap"
                          }}
                        >
                          View
                        </button>
                        <button 
                          className="edit-btn" 
                          onClick={() => startEdit(c)}
                          style={{
                            background: "#fef3c7",
                            color: "#b45309",
                            border: "none",
                            padding: "6px 10px",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            whiteSpace: "nowrap"
                          }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => removeCourse(c._id)}
                          style={{
                            background: "#fee2e2",
                            color: "#dc2626",
                            border: "none",
                            padding: "6px 10px",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            whiteSpace: "nowrap"
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "1rem" }}>
                    No courses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </main>
      </div>

      {/* ===== ADD COURSE MODAL ===== */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add Course</h3>

            <label>
              Course Name <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              placeholder="Enter course name"
              value={newCourse.name}
              onChange={handleNewChange}
            />

            <label>
              Category <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              name="category"
              placeholder="Enter category (e.g., AI, Management)"
              value={newCourse.category}
              onChange={handleNewChange}
            />

            <label>
              Duration <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              name="duration"
              placeholder="e.g., 2 hrs, 6 weeks"
              value={newCourse.duration}
              onChange={handleNewChange}
            />

            <label>Level</label>
            <select name="level" value={newCourse.level} onChange={handleNewChange}>
              <option value="">Select Level</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>

            <label>Status</label>
            <select name="status" value={newCourse.status} onChange={handleNewChange}>
              <option value="Free">Free</option>
              <option value="Premium">Premium</option>
            </select>

            <label>
              Teacher <span style={{ color: "red" }}>*</span>
            </label>
            <select name="teacherId" value={newCourse.teacherId} onChange={handleNewChange}>
              <option value="">Select Teacher</option>
              {teacherOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <div className="modal-actions">
              <button className="update-btn" onClick={handleAddCourse}>
                Save Course
              </button>
              <button
                className="delete-btn"
                onClick={() => {
                  resetNewCourse();
                  setIsAddModalOpen(false);
                  setErr("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT COURSE MODAL ===== */}
      {editing && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Course</h3>
            <p>
              Editing <strong>{editing.name}</strong>
            </p>

            <label>Course Name</label>
            <input
              type="text"
              name="name"
              value={editData.name}
              onChange={(e) => setEditData((prev) => ({ ...prev, name: e.target.value }))}
            />

            <label>Category</label>
            <input
              type="text"
              name="category"
              value={editData.category}
              onChange={(e) => setEditData((prev) => ({ ...prev, category: e.target.value }))}
            />

            <label>Duration</label>
            <input
              type="text"
              name="duration"
              value={editData.duration}
              onChange={(e) => setEditData((prev) => ({ ...prev, duration: e.target.value }))}
            />

            <label>Level</label>
            <select
              name="level"
              value={editData.level}
              onChange={(e) => setEditData((prev) => ({ ...prev, level: e.target.value }))}
            >
              <option value="">Select Level</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>

            <label>Status</label>
            <select
              name="status"
              value={editData.status}
              onChange={(e) => setEditData((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="">Select Status</option>
              <option value="Free">Free</option>
              <option value="Premium">Premium</option>
            </select>

            <label>Teacher</label>
            <select
              name="teacherId"
              value={editData.teacherId}
              onChange={(e) => setEditData((prev) => ({ ...prev, teacherId: e.target.value }))}
            >
              <option value="">Select Teacher</option>
              {teacherOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <div className="modal-actions">
              <button className="update-btn" onClick={saveEdit}>
                Save Changes
              </button>
              <button className="delete-btn" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCourse;
