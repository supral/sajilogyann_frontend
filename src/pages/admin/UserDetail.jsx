// src/pages/admin/UserDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import AdminSidebar from "./AdminSidebar";
import "../../styles/admin.css";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

// try both prefixes because your backend supports both
const API_PREFIXES = ["/api/v1", "/api"];

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
        if (res.ok) return { res, data, url };
        last = { res, data, url };
      } catch (e) {
        last = { error: e?.message || "Network error", url };
      }
    }
  }
  throw new Error(
    last?.error ||
      `API not found. Last tried: ${last?.url || "unknown endpoint"}`
  );
};

export default function UserDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("user");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [user, setUser] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [marks, setMarks] = useState([]);
  const [recentMcqs, setRecentMcqs] = useState([]);

  const token = getToken();

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const load = async () => {
    setLoading(true);
    setErr("");

    try {
      // ✅ Use the endpoint you ALREADY HAVE in backend:
      // GET /api/v1/admin/users/:id/profile
      const { data } = await apiFetchCandidates(
        [`/admin/users/${id}/profile`, `/admin/users/${id}`],
        { method: "GET", headers: authHeaders }
      );

      // profile endpoint returns: { user, enrolledCourses, marks, recentMcqs }
      // fallback endpoint returns: { user }
      const u = data.user || data;
      setUser(u);

      setEnrolledCourses(Array.isArray(data.enrolledCourses) ? data.enrolledCourses : []);
      setMarks(Array.isArray(data.marks) ? data.marks : []);
      setRecentMcqs(Array.isArray(data.recentMcqs) ? data.recentMcqs : []);
    } catch (e) {
      setErr(e?.message || "Failed to load student details");
      setUser(null);
      setEnrolledCourses([]);
      setMarks([]);
      setRecentMcqs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const formatDate = (d) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return "-";
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
          <div
            className="admin-page-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <h1 className="page-title" style={{ marginBottom: 6 }}>
                Student Details
              </h1>
              {/* ✅ REMOVED the frustrating note completely */}
              {err ? (
                <div style={{ color: "#ff4d4f", marginTop: 4 }}>
                  <b>Error:</b> {err}
                </div>
              ) : null}
            </div>

            <button className="update-btn" onClick={load} disabled={loading}>
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div className="admin-card">Loading…</div>
          ) : !user ? (
            <div className="admin-card">
              Student not found.
              <div style={{ marginTop: 12 }}>
                <button className="update-btn" onClick={() => navigate("/admin/users")}>
                  ← Back to User Management
                </button>
              </div>
            </div>
          ) : (
            <div className="admin-card" style={{ padding: 18 }}>
              {/* PERSONAL INFO */}
              <div className="detail-section" style={{ marginBottom: 18 }}>
                <h3 style={{ marginTop: 0 }}>👤 Personal Information</h3>
                <p><b>Full Name:</b> {user.name || user.fullName || "-"}</p>
                <p><b>Email:</b> {user.email || "-"}</p>
                <p style={{ textTransform: "capitalize" }}>
                  <b>Role:</b> {user.role || "student"}
                </p>
                <p><b>Phone:</b> {user.phone || "-"}</p>
                <p><b>Address:</b> {user.address || "-"}</p>
                <p><b>Created:</b> {formatDate(user.createdAt)}</p>
              </div>

              {/* ENROLLMENTS */}
              <div className="detail-section" style={{ marginBottom: 18 }}>
                <h3>📚 Course Enrollments</h3>
                {enrolledCourses.length === 0 ? (
                  <p style={{ opacity: 0.8 }}>No enrollment data available (no MCQ attempts yet).</p>
                ) : (
                  <ul style={{ marginTop: 10 }}>
                    {enrolledCourses.map((c, idx) => (
                      <li key={c.courseId || c._id || idx}>
                        <b>{c.title || c.courseName || "Course"}</b>{" "}
                        {typeof c.progressPercent === "number"
                          ? `— ${c.progressPercent}%`
                          : ""}
                        {c.status ? ` (${c.status})` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* MARKS */}
              <div className="detail-section" style={{ marginBottom: 18 }}>
                <h3>📈 Marks / Scores</h3>
                {marks.length === 0 ? (
                  <p style={{ opacity: 0.8 }}>No marks data available (no MCQ attempts yet).</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="user-table" style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th>Course</th>
                          <th>Score %</th>
                          <th>Grade</th>
                          <th>Attempts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marks.map((m, idx) => (
                          <tr key={m.courseId || idx}>
                            <td>{m.courseTitle || m.courseName || "-"}</td>
                            <td>{m.scorePercent ?? "-"}</td>
                            <td>{m.grade || "-"}</td>
                            <td>{m.totalAttempts ?? "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* RECENT MCQS */}
              <div className="detail-section" style={{ marginBottom: 18 }}>
                <h3>🧩 Recent MCQ Attempts</h3>
                {recentMcqs.length === 0 ? (
                  <p style={{ opacity: 0.8 }}>No attempts found.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="user-table" style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th>Course</th>
                          <th>Chapter</th>
                          <th>Marks</th>
                          <th>Result</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentMcqs.map((a, idx) => (
                          <tr key={idx}>
                            <td>{a.courseName || "-"}</td>
                            <td>{a.chapterName || "-"}</td>
                            <td>
                              {a.marksObtained ?? 0}/{a.totalMarks ?? 0}
                            </td>
                            <td style={{ textTransform: "capitalize" }}>
                              {a.result || "-"}
                            </td>
                            <td>{formatDate(a.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <button className="update-btn" onClick={() => navigate("/admin/users")}>
                ← Back to User Management
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
