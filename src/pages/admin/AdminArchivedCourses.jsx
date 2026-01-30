import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import AdminSidebar from "./AdminSidebar";
import "../../styles/admin.css";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("bs_user") || sessionStorage.getItem("bs_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const AdminArchivedCourses = () => {
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser(), []);
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("archived");

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Protect page
  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    const role = user?.role || "student";
    if (role !== "admin") {
      if (role === "teacher") navigate("/teacher-dashboard", { replace: true });
      else navigate("/student-dashboard", { replace: true });
    }
  }, [navigate, user]);

  const loadArchivedCourses = async () => {
    setLoading(true);
    setError("");

    const token = getToken();
    if (!token) {
      setError("You are not logged in. Please login again.");
      setLoading(false);
      return;
    }

    const urls = [
      `${API_HOST}/api/admin/courses/archived`,
      `${API_HOST}/api/v1/admin/courses/archived`
    ];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          if (res.status === 404 && i < urls.length - 1) {
            continue;
          }
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `Request failed: ${res.status}`);
        }

        const data = await res.json();
        setCourses(Array.isArray(data.courses) ? data.courses : []);
        setError("");
        setLoading(false);
        return;
        
      } catch (e) {
        if (i === urls.length - 1) {
          setError(e.message || "Failed to load archived courses");
          setCourses([]);
          setLoading(false);
        }
      }
    }
  };

  useEffect(() => {
    loadArchivedCourses();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="admin-layout">
      <Navbar />

      <div className="admin-container" style={{ marginTop: "80px" }}>
        <AdminSidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <main className={`admin-main ${sidebarOpen ? "" : "expanded"}`}>
          <div className="admin-content">
            {/* Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
              flexWrap: "wrap",
              gap: "16px"
            }}>
              <div>
                <h1 style={{ 
                  fontSize: "1.75rem", 
                  fontWeight: 700, 
                  color: "#0f172a",
                  margin: 0,
                  marginBottom: "4px"
                }}>
                  📦 Archived Courses
                </h1>
                <p style={{ color: "#64748b", margin: 0, fontSize: "0.95rem" }}>
                  View all archived courses from teachers. These courses are hidden from students.
                </p>
              </div>

              <button
                onClick={loadArchivedCourses}
                disabled={loading}
                style={{
                  padding: "10px 20px",
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <i className={`fa-solid ${loading ? "fa-spinner fa-spin" : "fa-rotate"}`}></i>
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: "16px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#dc2626",
                marginBottom: "20px"
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Stats */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "24px"
            }}>
              <div style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                border: "1px solid #e2e8f0"
              }}>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "#6b7280" }}>
                  {courses.length}
                </div>
                <div style={{ color: "#64748b", fontSize: "0.9rem" }}>
                  Total Archived Courses
                </div>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div style={{ 
                textAlign: "center", 
                padding: "60px 20px",
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
              }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "2rem", color: "#2563eb" }}></i>
                <p style={{ marginTop: "16px", color: "#64748b" }}>Loading archived courses...</p>
              </div>
            ) : courses.length > 0 ? (
              <div style={{
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                overflow: "hidden"
              }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.9rem"
                  }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                        <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: 600, color: "#475569" }}>
                          Course Title
                        </th>
                        <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: 600, color: "#475569" }}>
                          Category
                        </th>
                        <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: 600, color: "#475569" }}>
                          Uploaded By
                        </th>
                        <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: 600, color: "#475569" }}>
                          Created At
                        </th>
                        <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: 600, color: "#475569" }}>
                          Archived At
                        </th>
                        <th style={{ padding: "14px 16px", textAlign: "center", fontWeight: 600, color: "#475569" }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((course, index) => {
                        const courseId = course._id || course.id;
                        const teacher = course.teacherId;
                        const teacherName = typeof teacher === "object" 
                          ? teacher?.name || "Unknown" 
                          : "Unknown";
                        const teacherEmail = typeof teacher === "object" 
                          ? teacher?.email || "" 
                          : "";

                        return (
                          <tr 
                            key={courseId || index}
                            style={{ 
                              borderBottom: "1px solid #f1f5f9",
                              transition: "background 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                          >
                            <td style={{ padding: "14px 16px" }}>
                              <div style={{ fontWeight: 600, color: "#1e293b" }}>
                                {course.title || course.name || "Untitled"}
                              </div>
                              <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" }}>
                                Duration: {course.duration || "-"}
                              </div>
                            </td>
                            <td style={{ padding: "14px 16px" }}>
                              <span style={{
                                background: course.category === "IT" ? "#dbeafe" : "#fef3c7",
                                color: course.category === "IT" ? "#1d4ed8" : "#b45309",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontSize: "0.8rem",
                                fontWeight: 600
                              }}>
                                {course.category || "-"}
                              </span>
                            </td>
                            <td style={{ padding: "14px 16px" }}>
                              <div style={{ fontWeight: 500, color: "#334155" }}>
                                {teacherName}
                              </div>
                              {teacherEmail && (
                                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                                  {teacherEmail}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: "14px 16px", color: "#64748b" }}>
                              {formatDate(course.createdAt)}
                            </td>
                            <td style={{ padding: "14px 16px", color: "#64748b" }}>
                              {formatDate(course.archivedAt)}
                            </td>
                            <td style={{ padding: "14px 16px", textAlign: "center" }}>
                              <span style={{
                                background: "#f1f5f9",
                                color: "#64748b",
                                padding: "4px 12px",
                                borderRadius: "20px",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}>
                                <i className="fa-solid fa-box-archive"></i>
                                Archived
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: "center",
                padding: "60px 20px",
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
              }}>
                <div style={{ fontSize: "4rem", marginBottom: "16px" }}>📭</div>
                <h3 style={{ color: "#475569", marginBottom: "8px" }}>No Archived Courses</h3>
                <p style={{ color: "#94a3b8" }}>
                  When teachers archive their courses, they will appear here.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminArchivedCourses;
