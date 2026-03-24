import React, { useEffect, useMemo, useState, useCallback } from "react";
import "../../styles/ViewCourses.css";
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

const COURSES_PAGE_SIZE = 10;

const ViewCourses = () => {
  const navigate = useNavigate();

  // ✅ so sidebar highlights correct section
  const [activeTab, setActiveTab] = useState("view-courses");

  const user = useMemo(() => getStoredUser(), []);

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [archivingId, setArchivingId] = useState(null);
  const [coursesPage, setCoursesPage] = useState(1);

  // protect page (extra safety)
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
    // eslint-disable-next-line
  }, []);

  const loadMyCourses = useCallback(async () => {
    setLoading(true);
    setError("");
    setCourses([]);

    const token = getToken();

    if (!token) {
      const msg = "You are not logged in. Please login again.";
      setError(msg);
      setLoading(false);
      return;
    }

    // ✅ SIMPLIFIED: Try /api first, then /api/v1
    const urls = [
      `${API_HOST}/api/teacher/courses`,
      `${API_HOST}/api/v1/teacher/courses`
    ];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
        });

        if (!res.ok) {
          let errorText = "";
          try {
            const errorData = await res.json();
            errorText = errorData.message || errorData.error || `HTTP ${res.status}`;
          } catch {
            errorText = await res.text();
          }

          if (res.status === 404 && i < urls.length - 1) {
            continue;
          }

          if (res.status === 401 || res.status === 403) {
            throw new Error(errorText || "Authentication failed");
          }

          throw new Error(errorText || `Request failed: ${res.status}`);
        }

        // Parse successful response
        const data = await res.json();

        // Extract courses - Backend returns: { courses: [...] }
        let coursesList = [];
        
        if (Array.isArray(data.courses)) {
          coursesList = data.courses;
        } else if (Array.isArray(data)) {
          coursesList = data;
        } else {
          coursesList = [];
        }

        setCourses(coursesList);
        setError("");
        setLoading(false);
        return;
        
      } catch (e) {
        if (i === urls.length - 1) {
          // Last attempt failed
          const errorMsg = e.message || "Failed to load courses";
          setError(errorMsg);
          setCourses([]);
          setLoading(false);
        }
        // Otherwise continue to next URL
      }
    }
  }, []);

  useEffect(() => {
    loadMyCourses();
  }, [loadMyCourses]);

  const coursesTotalPages = Math.max(
    1,
    Math.ceil(courses.length / COURSES_PAGE_SIZE)
  );
  const coursesPageSafe = Math.min(coursesPage, coursesTotalPages);
  const pagedCourses = courses.slice(
    (coursesPageSafe - 1) * COURSES_PAGE_SIZE,
    coursesPageSafe * COURSES_PAGE_SIZE
  );

  useEffect(() => {
    if (coursesPage > coursesTotalPages) setCoursesPage(coursesTotalPages);
  }, [coursesPage, coursesTotalPages]);

  const handleArchive = async (courseId, courseTitle, e) => {
    e.stopPropagation(); // Prevent card click
    
    if (!window.confirm(`Are you sure you want to archive "${courseTitle}"? It will be hidden from students.`)) {
      return;
    }

    setArchivingId(courseId);
    const token = getToken();

    try {
      const res = await fetch(`${API_HOST}/api/teacher/courses/${courseId}/archive`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to archive course");
      }

      // Remove from list
      setCourses((prev) => {
        const next = prev.filter((c) => c._id !== courseId);
        const pages = Math.max(1, Math.ceil(next.length / COURSES_PAGE_SIZE));
        setCoursesPage((p) => Math.min(p, pages));
        return next;
      });
      alert(`"${courseTitle}" has been archived. You can find it in Archived Courses.`);
    } catch (err) {
      alert(err.message || "Failed to archive course");
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <div className="teacher-dashboard-layout">
      {/* ✅ use same navbar everywhere */}
      <NavbarAfterLogin user={user} />

      <div className="teacher-body">
        <TeacherSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="teacher-content">
          <div className="view-courses">
            <div className="vc__top">
              <div>
                <h2>📚 My Uploaded Courses</h2>
                <p>Only the courses you created will show here.</p>
              </div>

              <div className="vc__actions">
                <button
                  className="submit-btn"
                  type="button"
                  onClick={loadMyCourses}
                  disabled={loading}
                  style={{ width: "auto", padding: "10px 18px" }}
                >
                  {loading ? "Loading..." : "🔄 Refresh"}
                </button>
              </div>
            </div>

            {error && (
              <div className="vc__error" style={{ 
                padding: 16, 
                background: "#ffe6e6", 
                borderRadius: 8, 
                marginTop: 14,
                color: "#d32f2f",
                border: "1px solid #ffcdd2"
              }}>
                <div style={{ marginBottom: 8 }}>
                  <strong>⚠️ Error Loading Courses:</strong>
                </div>
                <div style={{ marginBottom: 12, fontSize: 14 }}>
                  {error}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={loadMyCourses}
                    disabled={loading}
                    style={{
                      padding: "8px 16px",
                      background: "#1976d2",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? "Retrying..." : "Retry"}
                  </button>
                  <button
                    onClick={() => {
                      localStorage.removeItem("bs_token");
                      sessionStorage.removeItem("bs_token");
                      navigate("/login");
                    }}
                    style={{
                      padding: "8px 16px",
                      background: "#f44336",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer"
                    }}
                  >
                    Logout & Login Again
                  </button>
                </div>
                {error.includes("401") || error.includes("Unauthorized") ? (
                  <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
                    💡 Your session may have expired. Try logging out and logging back in.
                  </div>
                ) : error.includes("404") ? (
                  <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
                    💡 The API endpoint may not be found. Check if the backend server is running.
                  </div>
                ) : error.includes("Cannot connect") ? (
                  <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
                    💡 Cannot reach the backend server. Make sure it's running on port 5000.
                  </div>
                ) : null}
              </div>
            )}

            {/* ✅ SIMPLIFIED RENDERING - No IIFE, direct conditional rendering */}
            {loading ? (
              <div style={{ marginTop: 20, textAlign: "center", padding: 20 }}>
                <p>⏳ Loading courses...</p>
              </div>
            ) : courses && courses.length > 0 ? (
              <div style={{ marginTop: 20 }}>
                <p
                  style={{
                    margin: "0 0 12px",
                    fontSize: "0.875rem",
                    color: "#64748b",
                  }}
                >
                  {courses.length} course{courses.length !== 1 ? "s" : ""} ·{" "}
                  {COURSES_PAGE_SIZE} per page · click a row to open course details
                </p>
                <div className="vc-tableWrap">
                  <table className="vc-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Duration</th>
                        <th>Description</th>
                        <th>Created</th>
                        <th style={{ width: 120 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedCourses.map((course, index) => {
                        const courseId = course._id || course.id;
                        if (!courseId) return null;
                        const isArchiving = archivingId === courseId;
                        const desc = (course.description || "").trim();
                        const descShort =
                          desc.length > 80 ? `${desc.slice(0, 80)}…` : desc || "—";
                        return (
                          <tr
                            key={courseId || `course-${index}`}
                            className="vc-table__row"
                            onClick={() => navigate(`/course-detail/${courseId}`)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                navigate(`/course-detail/${courseId}`);
                              }
                            }}
                          >
                            <td className="vc-table__title">
                              {course.title || "Untitled Course"}
                            </td>
                            <td>{course.category || "—"}</td>
                            <td>{course.duration ?? "—"}</td>
                            <td className="vc-table__desc" title={desc || undefined}>
                              {descShort}
                            </td>
                            <td className="vc-table__muted">
                              {course.createdAt
                                ? new Date(course.createdAt).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="vc-table__actions">
                              <button
                                type="button"
                                className="vc-table__btn vc-table__btn--archive"
                                onClick={(e) =>
                                  handleArchive(courseId, course.title, e)
                                }
                                disabled={isArchiving}
                                title="Archive"
                              >
                                {isArchiving ? (
                                  <i className="fa-solid fa-spinner fa-spin" />
                                ) : (
                                  <i className="fa-solid fa-box-archive" />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {coursesTotalPages > 1 && (
                  <div className="vc-pagination">
                    <button
                      type="button"
                      className="vc-pagination__btn"
                      disabled={coursesPageSafe <= 1}
                      onClick={() => setCoursesPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <span className="vc-pagination__info">
                      Page {coursesPageSafe} of {coursesTotalPages}
                    </span>
                    <button
                      type="button"
                      className="vc-pagination__btn"
                      disabled={coursesPageSafe >= coursesTotalPages}
                      onClick={() =>
                        setCoursesPage((p) =>
                          Math.min(coursesTotalPages, p + 1)
                        )
                      }
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ 
                marginTop: 20, 
                padding: 30, 
                textAlign: "center",
                background: "#f9f9f9",
                borderRadius: 8
              }}>
                <p style={{ fontSize: 16, color: "#666", marginBottom: 10 }}>
                  No courses found.
                </p>
                <p style={{ fontSize: 14, color: "#999" }}>
                  {error ? `Error: ${error}` : "You haven't created any courses yet. Click 'Create Course' to get started!"}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ViewCourses;
