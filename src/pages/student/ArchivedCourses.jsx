import React, { useEffect, useState } from "react";
import StudentPageLayout from "./StudentPageLayout";
import { useNavigate } from "react-router-dom";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const ARCHIVED_COURSES_ENDPOINTS = [
  "/api/v1/students/archived-courses",
  "/api/students/archived-courses"
];

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

// Helper function for timeout fetch
async function fetchWithTimeout(url, options = {}, timeoutMs = 7000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export default function StudentArchivedCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [unarchivingId, setUnarchivingId] = useState(null);
  const navigate = useNavigate();

  const fetchArchivedCourses = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    const token = getToken();
    if (!token) {
      setError("Please login to view archived courses.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const authHeader = { Authorization: `Bearer ${token}` };

    // Try all endpoints
    for (const endpoint of ARCHIVED_COURSES_ENDPOINTS) {
      const url = `${API_HOST}${endpoint}`;
      try {
        const res = await fetchWithTimeout(
          url,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              ...authHeader,
            },
          },
          7000
        );

        if (!res.ok) {
          if (res.status === 401) {
            setError("Please login to view archived courses.");
            break;
          }
          continue;
        }

        const data = await res.json();

        let courseList = [];
        if (Array.isArray(data?.courses)) {
          courseList = data.courses;
        } else if (Array.isArray(data?.data?.courses)) {
          courseList = data.data.courses;
        } else if (Array.isArray(data)) {
          courseList = data;
        }

        // Normalize course data
        const normalizedCourses = courseList.map((course) => {
          const courseId = course?._id || course?.courseId || course?.id || "";
          const title =
            course?.title ||
            course?.courseName ||
            course?.name ||
            course?.course?.title ||
            "Untitled Course";
          const description =
            course?.description ||
            course?.desc ||
            course?.overview ||
            course?.course?.description ||
            "";
          const category = course?.category || course?.course?.category || "";
          const teacherName =
            course?.teacherName ||
            course?.instructorName ||
            course?.instructor ||
            course?.course?.teacherName ||
            "Unknown";
          const progress = course?.progress || course?.courseProgress || null;
          const archivedAt = course?.archivedAt || null;

          return {
            id: String(courseId),
            title: String(title).trim() || "Untitled Course",
            description: String(description).trim(),
            category: String(category).trim(),
            teacherName: String(teacherName).trim(),
            progress: progress,
            archivedAt: archivedAt,
            raw: course,
          };
        });

        setCourses(normalizedCourses);
        setError("");
        setLoading(false);
        setRefreshing(false);
        return;
      } catch (err) {
        if (err.name === "AbortError") {
          setError("Request timed out. Please try again.");
        } else {
          console.error(`Error fetching from ${endpoint}:`, err);
        }
      }
    }

    if (!error) {
      setError("Failed to load archived courses. Please try again later.");
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchArchivedCourses();
  }, []);

  const handleRefresh = () => {
    fetchArchivedCourses(true);
  };

  const handleUnarchive = async (courseId, courseTitle) => {
    if (!window.confirm(`Are you sure you want to unarchive "${courseTitle}"? It will appear in your enrolled courses again.`)) {
      return;
    }

    setUnarchivingId(courseId);
    const token = getToken();

    const endpoints = [
      `${API_HOST}/api/v1/students/courses/${courseId}/unarchive`,
      `${API_HOST}/api/students/courses/${courseId}/unarchive`
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          if (res.status === 404) continue;
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to unarchive course");
        }

        // Success - remove from list
        setCourses(prev => prev.filter(c => c.id !== courseId));
        setUnarchivingId(null);
        return;
      } catch (err) {
        console.error("Unarchive error:", err);
      }
    }

    alert("Failed to unarchive course. Please try again.");
    setUnarchivingId(null);
  };

  const handleCourseClick = (courseId) => {
    navigate(`/student/course/${courseId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <StudentPageLayout title="Archived Courses" activePath="/student/archived-courses">
      {/* Header with refresh button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "600", color: "#0f172a" }}>
            <i className="fa-solid fa-box-archive" style={{ marginRight: "10px", color: "#6b7280" }}></i>
            Archived Courses
          </h2>
          <p style={{ margin: "0.5rem 0 0 0", color: "#64748b", fontSize: "0.875rem" }}>
            {courses.length > 0
              ? `You have ${courses.length} archived course${courses.length !== 1 ? "s" : ""}`
              : "Courses you've completed and archived will appear here"}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: "500",
            cursor: loading || refreshing ? "not-allowed" : "pointer",
            opacity: loading || refreshing ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            if (!loading && !refreshing) {
              e.currentTarget.style.backgroundColor = "#2563eb";
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && !refreshing) {
              e.currentTarget.style.backgroundColor = "#3b82f6";
            }
          }}
        >
          <i className={`fa-solid ${refreshing ? "fa-spinner fa-spin" : "fa-arrow-rotate-right"}`}></i>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Info banner */}
      <div
        style={{
          padding: "1rem",
          backgroundColor: "#f0f9ff",
          border: "1px solid #bae6fd",
          borderRadius: "8px",
          color: "#0369a1",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <i className="fa-solid fa-circle-info" style={{ fontSize: "1.25rem" }}></i>
        <span style={{ fontSize: "0.875rem" }}>
          Archived courses are completed courses you've chosen to hide from your main list. 
          You can unarchive them anytime to view them in your enrolled courses.
        </span>
      </div>

      {/* Error message */}
      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#991b1b",
            marginBottom: "1.5rem",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            color: "#64748b",
          }}
        >
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "2rem", marginBottom: "1rem" }}></i>
          <p>Loading your archived courses...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && courses.length === 0 && (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            backgroundColor: "#f8fafc",
            borderRadius: "12px",
            border: "2px dashed #cbd5e1",
          }}
        >
          <i className="fa-solid fa-box-open" style={{ fontSize: "3rem", color: "#94a3b8", marginBottom: "1rem" }}></i>
          <h3 style={{ margin: "0 0 0.5rem 0", color: "#334155" }}>No Archived Courses</h3>
          <p style={{ margin: "0 0 1.5rem 0", color: "#64748b" }}>
            You haven't archived any courses yet. Complete a course and archive it to see it here.
          </p>
          <button
            onClick={() => navigate("/student/enrolled-courses")}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#2563eb";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#3b82f6";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            View Enrolled Courses
          </button>
        </div>
      )}

      {/* Courses list */}
      {!loading && !error && courses.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {courses.map((course) => {
            const progressPercent = course.progress?.progressPercent || course.progress?.progress || 100;
            const isUnarchiving = unarchivingId === course.id;

            return (
              <div
                key={course.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  backgroundColor: "white",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                {/* Course Info */}
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "1.125rem",
                        fontWeight: "600",
                        color: "#0f172a",
                        cursor: "pointer",
                      }}
                      onClick={() => handleCourseClick(course.id)}
                    >
                      {course.title}
                    </h4>
                    <span
                      style={{
                        padding: "0.25rem 0.75rem",
                        backgroundColor: "#dcfce7",
                        color: "#16a34a",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                      }}
                    >
                      ✓ Completed
                    </span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.875rem", color: "#64748b" }}>
                    {course.category && (
                      <span>
                        <i className="fa-solid fa-tag" style={{ marginRight: "0.4rem", color: "#6366f1" }}></i>
                        {course.category}
                      </span>
                    )}
                    <span>
                      <i className="fa-solid fa-user-tie" style={{ marginRight: "0.4rem" }}></i>
                      {course.teacherName}
                    </span>
                    <span>
                      <i className="fa-solid fa-calendar" style={{ marginRight: "0.4rem" }}></i>
                      Archived: {formatDate(course.archivedAt)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button
                    onClick={() => handleUnarchive(course.id, course.title)}
                    disabled={isUnarchiving}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: isUnarchiving ? "#94a3b8" : "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: isUnarchiving ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isUnarchiving) {
                        e.currentTarget.style.backgroundColor = "#059669";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isUnarchiving) {
                        e.currentTarget.style.backgroundColor = "#10b981";
                      }
                    }}
                  >
                    {isUnarchiving ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fa-solid fa-box-open"></i>
                    )}
                    {isUnarchiving ? "Unarchiving..." : "Unarchive"}
                  </button>

                  <button
                    onClick={() => handleCourseClick(course.id)}
                    style={{
                      padding: "0.5rem 0.75rem",
                      backgroundColor: "#e2e8f0",
                      color: "#64748b",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#cbd5e1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#e2e8f0";
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
      )}
    </StudentPageLayout>
  );
}
