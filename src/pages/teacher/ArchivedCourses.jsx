import React, { useEffect, useMemo, useState } from "react";
import "../../styles/TeacherDashboard.css";
import { useNavigate } from "react-router-dom";
import TeacherSidebar from "./TeacherSidebar";
import NavbarAfterLogin from "./NavbarAfterLogin";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

const getStoredUser = () => {
  try {
    const raw =
      localStorage.getItem("bs_user") || sessionStorage.getItem("bs_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const ArchivedCourses = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("archived-courses");
  const user = useMemo(() => getStoredUser(), []);

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unarchivingId, setUnarchivingId] = useState(null);

  // Protect page
  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    const role = user?.role || "student";
    if (role !== "teacher") {
      if (role === "admin") navigate("/admin-dashboard", { replace: true });
      else navigate("/student-dashboard", { replace: true });
    }
  }, [navigate, user]);

  const loadArchivedCourses = async () => {
    setLoading(true);
    setError("");
    setCourses([]);

    const token = getToken();
    if (!token) {
      setError("You are not logged in. Please login again.");
      setLoading(false);
      return;
    }

    const urls = [
      `${API_HOST}/api/teacher/courses/archived`,
      `${API_HOST}/api/v1/teacher/courses/archived`
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

  const handleUnarchive = async (courseId, courseTitle) => {
    if (!window.confirm(`Are you sure you want to unarchive "${courseTitle}"? It will become visible to students again.`)) {
      return;
    }

    setUnarchivingId(courseId);
    const token = getToken();

    try {
      const res = await fetch(`${API_HOST}/api/teacher/courses/${courseId}/unarchive`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to unarchive course");
      }

      // Remove from list
      setCourses(prev => prev.filter(c => c._id !== courseId));
      alert(`"${courseTitle}" has been unarchived and is now visible to students.`);
    } catch (err) {
      alert(err.message || "Failed to unarchive course");
    } finally {
      setUnarchivingId(null);
    }
  };

  useEffect(() => {
    loadArchivedCourses();
  }, []);

  return (
    <div className="teacher-dashboard-layout">
      <NavbarAfterLogin user={user} />

      <div className="teacher-body" style={{ paddingTop: "70px" }}>
        <TeacherSidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
        />

        <main className="teacher-content">
          <div style={{
            maxWidth: "1100px",
            margin: "0 auto",
            background: "#fff",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)"
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "flex-start",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "12px"
            }}>
              <div>
                <h2 style={{ color: "#1e293b", fontSize: "1.4rem", margin: 0, marginBottom: "6px" }}>
                  📦 Archived Courses
                </h2>
                <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem" }}>
                  These courses are hidden from students. You can unarchive them to make them visible again.
                </p>
              </div>

              <button
                type="button"
                onClick={loadArchivedCourses}
                disabled={loading}
                style={{ 
                  padding: "10px 18px",
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? "Loading..." : "🔄 Refresh"}
              </button>
            </div>

            {error && (
              <div style={{ 
                padding: 16, 
                background: "#ffe6e6", 
                borderRadius: 8, 
                marginTop: 14,
                color: "#d32f2f",
                border: "1px solid #ffcdd2"
              }}>
                <strong>⚠️ Error:</strong> {error}
              </div>
            )}

            {loading ? (
              <div style={{ marginTop: 20, textAlign: "center", padding: 20 }}>
                <p>⏳ Loading archived courses...</p>
              </div>
            ) : courses && courses.length > 0 ? (
              <div style={{ marginTop: 16 }}>
                <div 
                  className="course-grid" 
                  style={{ 
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    width: "100%"
                  }}
                >
                  {courses.map((course) => {
                    const courseId = course._id || course.id;
                    if (!courseId) return null;
                    
                    const isUnarchiving = unarchivingId === courseId;
                    
                    return (
                      <div
                        key={courseId}
                        style={{
                          background: "#f8f9fa",
                          border: "1px solid #e0e0e0",
                          borderRadius: "10px",
                          padding: "14px 20px",
                          display: "flex",
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                        }}
                      >
                        {/* Course info - LEFT side */}
                        <div style={{ 
                          display: "flex", 
                          flexDirection: "column", 
                          alignItems: "flex-start",
                          gap: "4px",
                          flex: 1,
                          minWidth: 0
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <h3 style={{ 
                              margin: 0, 
                              fontSize: "1rem",
                              color: "#333",
                              fontWeight: 600,
                            }}>
                              {course.title || "Untitled Course"}
                            </h3>
                            <span style={{
                              background: "#6b7280",
                              color: "white",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "0.7rem",
                              fontWeight: "600",
                            }}>
                              Archived
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.8rem", color: "#666" }}>
                            <span style={{ color: "#6366f1", fontWeight: 500 }}>
                              <i className="fa-solid fa-tag"></i> {course.category || "-"}
                            </span>
                            <span>
                              <i className="fa-regular fa-clock"></i> {course.duration || "-"}
                            </span>
                            {course.archivedAt && (
                              <span style={{ color: "#888" }}>
                                <i className="fa-solid fa-calendar"></i> {new Date(course.archivedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions - RIGHT side */}
                        <div style={{ 
                          display: "flex", 
                          gap: "8px", 
                          alignItems: "center", 
                          marginLeft: "20px",
                          flexShrink: 0 
                        }}>
                          <button
                            onClick={() => handleUnarchive(courseId, course.title)}
                            disabled={isUnarchiving}
                            style={{
                              padding: "8px 14px",
                              background: isUnarchiving ? "#94a3b8" : "linear-gradient(135deg, #10b981, #059669)",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "0.8rem",
                              fontWeight: "600",
                              cursor: isUnarchiving ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            {isUnarchiving ? (
                              <i className="fa-solid fa-spinner fa-spin"></i>
                            ) : (
                              <i className="fa-solid fa-box-open"></i>
                            )}
                            {isUnarchiving ? "..." : "Unarchive"}
                          </button>

                          <button
                            onClick={() => navigate(`/course-detail/${courseId}`)}
                            style={{
                              padding: "8px 10px",
                              background: "#e2e8f0",
                              color: "#64748b",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "0.8rem",
                              cursor: "pointer",
                            }}
                            title="View course details"
                          >
                            <i className="fa-solid fa-eye"></i>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ 
                marginTop: 20, 
                padding: 40, 
                textAlign: "center",
                background: "#f9fafb",
                borderRadius: 12,
                border: "2px dashed #e5e7eb"
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                <p style={{ fontSize: 16, color: "#6b7280", marginBottom: 8, fontWeight: 600 }}>
                  No archived courses
                </p>
                <p style={{ fontSize: 14, color: "#9ca3af" }}>
                  When you archive a course, it will appear here.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ArchivedCourses;
