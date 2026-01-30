// src/pages/teacher/CourseDetail.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import "../../styles/CourseDetail.css";
import { useNavigate, useParams } from "react-router-dom";
import TeacherSidebar from "./TeacherSidebar";
import NavbarAfterLogin from "./NavbarAfterLogin";

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

async function apiJson(path, { method = "GET", body } = {}) {
  const token = getToken();
  if (!token) throw new Error("Token not found. Please login again.");

  let lastError = null;
  
  // Try both API prefixes
  for (const prefix of API_PREFIXES) {
    try {
      const res = await fetch(`${API_HOST}${prefix}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await safeJson(res);

      if (res.ok) {
        return data;
      }

      lastError = new Error(data?.message || data?.error || `Request failed (${res.status})`);
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error("Failed to fetch: Backend not reachable.");
}

const CourseDetail = () => {
  const { id } = useParams(); // courseId
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      const raw =
        localStorage.getItem("bs_user") || sessionStorage.getItem("bs_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const [activeTab, setActiveTab] = useState("course");

  // course
  const [course, setCourse] = useState(null);
  const [loadingCourse, setLoadingCourse] = useState(true); // Start with true to show loading

  // chapters
  const [chapters, setChapters] = useState([]);
  const [loadingChapters, setLoadingChapters] = useState(true); // Start with true to show loading

  const [error, setError] = useState("");

  const loadCourse = useCallback(async () => {
    if (!id) {
      setError("Course ID is missing");
      setLoadingCourse(false);
      return;
    }

    setLoadingCourse(true);
    setError("");
    try {
      const data = await apiJson(`/teacher/courses/${id}`, { method: "GET" });
      console.log("Course data received:", data);
      if (data?.course) {
        setCourse(data.course);
      } else {
        setCourse(null);
        setError("Course data not found in response");
      }
    } catch (e) {
      console.error("Error loading course:", e);
      setCourse(null);
      setError(e.message || "Failed to load course");
    } finally {
      setLoadingCourse(false);
    }
  }, [id]);

  const loadChapters = useCallback(async () => {
    if (!id) {
      setLoadingChapters(false);
      return;
    }

    setLoadingChapters(true);
    try {
      const data = await apiJson(`/teacher/courses/${id}/chapters`, { method: "GET" });
      console.log("Chapters data received:", data);
      const chaptersList = Array.isArray(data?.chapters) ? data.chapters : [];
      setChapters(chaptersList);
      if (chaptersList.length === 0) {
        // Don't set error if chapters list is empty, just show empty state
        console.log("No chapters found for this course");
      }
    } catch (e) {
      console.error("Error loading chapters:", e);
      setChapters([]);
      // Only set error for chapters if it's a critical error
      // Empty chapters list is not an error
    } finally {
      setLoadingChapters(false);
    }
  }, [id]);

  useEffect(() => {
    console.log("CourseDetail mounted/updated with id:", id);
    if (id) {
      // Reset states when id changes
      setCourse(null);
      setChapters([]);
      setError("");
      setLoadingCourse(true);
      setLoadingChapters(true);
      
      // Fetch data
      loadCourse();
      loadChapters();
    } else {
      console.warn("CourseDetail: No course ID provided");
      setError("Course ID is missing");
      setLoadingCourse(false);
      setLoadingChapters(false);
    }
  }, [id, loadCourse, loadChapters]);


  const prettyDuration = useMemo(() => {
    if (!course?.duration) return "-";
    return String(course.duration);
  }, [course]);

  const goLessonDetail = (chapterId) => {
    // ✅ redirect to lesson detail
    navigate(`/teacher/courses/${id}/lessons/${chapterId}`);
  };

  return (
    <div className="teacher-dashboard-layout">
      {/* NAVBAR */}
      <NavbarAfterLogin user={user} />

      {/* BODY */}
      <div className="teacher-body">
        <TeacherSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="teacher-content">
          <div className="course-detail">
            {loadingCourse ? (
              <div style={{ padding: 20, textAlign: "center" }}>
                <p>Loading course data...</p>
              </div>
            ) : error ? (
              <div style={{ padding: 12, background: "#ffe6e6", borderRadius: 10 }}>
                <strong>Error:</strong> {error}
                <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                  <button
                    className="submit-btn"
                    type="button"
                    onClick={() => {
                      loadCourse();
                      loadChapters();
                    }}
                  >
                    Retry
                  </button>
                  <button className="cancel-btn" type="button" onClick={() => navigate(-1)}>
                    Go Back
                  </button>
                </div>
              </div>
            ) : !course ? (
              <div style={{ padding: 20 }}>
                <p>No course found.</p>
                <button className="cancel-btn" type="button" onClick={() => navigate(-1)} style={{ marginTop: 10 }}>
                  Go Back
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <h2>{course.title || "Untitled Course"}</h2>
                  <p style={{ marginTop: 8, color: "#666" }}>
                    {course.description || "No description available"}
                  </p>

                  <div style={{ marginTop: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <p style={{ margin: 0 }}>
                      <strong>Duration:</strong> {prettyDuration}
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>Category:</strong> {course.category || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Upload Lesson -> redirect */}
                <div className="course-actions" style={{ marginBottom: 20 }}>
                  <button
                    className="primary-btn"
                    onClick={() => navigate(`/teacher/courses/${id}/create-lesson`)}
                  >
                    Upload Lesson
                  </button>
                </div>

                {/* ✅ TABLE ONLY */}
                <div style={{ marginTop: 18 }}>
                  <h3 style={{ marginBottom: 10 }}>📚 Lessons / Chapters</h3>

                  {loadingChapters ? (
                    <p style={{ padding: 12, background: "#f5f5f5", borderRadius: 8 }}>
                      Loading chapters...
                    </p>
                  ) : chapters.length === 0 ? (
                    <p style={{ padding: 12, opacity: 0.8, background: "#f9f9f9", borderRadius: 8 }}>
                      No lessons posted yet for this course.
                    </p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          background: "#fff",
                          borderRadius: 12,
                          overflow: "hidden",
                          border: "1px solid #e8e8e8",
                        }}
                      >
                        <thead>
                          <tr style={{ background: "#f7f8fb", textAlign: "left" }}>
                            <th style={{ padding: "12px 14px", borderBottom: "1px solid #e8e8e8" }}>
                              Chapter Name
                            </th>
                            <th style={{ padding: "12px 14px", borderBottom: "1px solid #e8e8e8" }}>
                              Uploaded Time
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {chapters.map((ch) => (
                            <tr
                              key={ch._id}
                              onClick={() => goLessonDetail(ch._id)}
                              style={{
                                cursor: "pointer",
                                borderBottom: "1px solid #f0f0f0",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#fafbff")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <td style={{ padding: "12px 14px" }}>
                                {ch.chapterName || "Untitled Chapter"}
                              </td>
                              <td style={{ padding: "12px 14px", opacity: 0.8 }}>
                                {ch.createdAt ? new Date(ch.createdAt).toLocaleString() : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <p style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
                        Tip: Click a chapter row to open lesson details.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CourseDetail;
