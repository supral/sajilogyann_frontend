import React, { useEffect, useState } from "react";
import StudentPageLayout from "./StudentPageLayout";
import { useNavigate } from "react-router-dom";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_PREFIXES = ["/api/v1", "/api"];
const ENROLLED_COURSES_ENDPOINTS = [
  "/api/v1/students/enrolled-courses",
  "/api/students/enrolled-courses"
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

export default function EnrolledCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [archivingId, setArchivingId] = useState(null);
  const navigate = useNavigate();

  const fetchCourses = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    const token = getToken();
    if (!token) {
      setError("Please login to view enrolled courses.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const authHeader = { Authorization: `Bearer ${token}` };

    // Try all endpoints
    for (const endpoint of ENROLLED_COURSES_ENDPOINTS) {
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
          // If 401, user is not authenticated
          if (res.status === 401) {
            setError("Please login to view enrolled courses.");
            break;
          }
          // Try next endpoint
          continue;
        }

        const data = await res.json();

        // Handle different response formats
        let courseList = [];
        if (Array.isArray(data?.courses)) {
          courseList = data.courses;
        } else if (Array.isArray(data?.data?.courses)) {
          courseList = data.data.courses;
        } else if (Array.isArray(data)) {
          courseList = data;
        } else if (data?.courses && Array.isArray(data.courses)) {
          courseList = data.courses;
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

          return {
            id: String(courseId),
            title: String(title).trim() || "Untitled Course",
            description: String(description).trim(),
            category: String(category).trim(),
            teacherName: String(teacherName).trim(),
            progress: progress,
            raw: course, // Keep original data
          };
        });

        setCourses(normalizedCourses);
        setError("");
        setLoading(false);
        setRefreshing(false);
        return; // Success, exit
      } catch (err) {
        if (err.name === "AbortError") {
          setError("Request timed out. Please try again.");
        } else {
          console.error(`Error fetching from ${endpoint}:`, err);
          // Continue to next endpoint
        }
      }
    }

    // If we reach here, all endpoints failed
    if (!error) {
      setError("Failed to load enrolled courses. Please try again later.");
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleRefresh = () => {
    fetchCourses(true);
  };

  const handleCourseClick = (courseId) => {
    navigate(`/student/course/${courseId}`);
  };

  const handleArchive = async (e, courseId, courseTitle) => {
    e.stopPropagation(); // Prevent card click
    
    if (!window.confirm(`Are you sure you want to archive "${courseTitle}"? You can unarchive it later from the Archived Courses section.`)) {
      return;
    }

    setArchivingId(courseId);
    const token = getToken();

    const endpoints = [
      `${API_HOST}/api/v1/students/courses/${courseId}/archive`,
      `${API_HOST}/api/students/courses/${courseId}/archive`
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
          throw new Error(errorData.message || "Failed to archive course");
        }

        // Success - remove from list
        setCourses(prev => prev.filter(c => c.id !== courseId));
        setArchivingId(null);
        return;
      } catch (err) {
        console.error("Archive error:", err);
        if (err.message && !err.message.includes("404")) {
          alert(err.message);
          setArchivingId(null);
          return;
        }
      }
    }

    alert("Failed to archive course. Please try again.");
    setArchivingId(null);
  };

  return (
    <StudentPageLayout title="Enrolled Courses" activePath="/student/enrolled-courses">
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
            My Enrolled Courses
          </h2>
          <p style={{ margin: "0.5rem 0 0 0", color: "#64748b", fontSize: "0.875rem" }}>
            {courses.length > 0
              ? `You are enrolled in ${courses.length} course${courses.length !== 1 ? "s" : ""}`
              : "View all courses you've enrolled in"}
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
          <p>Loading your enrolled courses...</p>
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
          <i className="fa-solid fa-book-open" style={{ fontSize: "3rem", color: "#94a3b8", marginBottom: "1rem" }}></i>
          <h3 style={{ margin: "0 0 0.5rem 0", color: "#334155" }}>No Enrolled Courses</h3>
          <p style={{ margin: "0 0 1.5rem 0", color: "#64748b" }}>
            You haven't enrolled in any courses yet. Browse available courses and enroll to get started!
          </p>
          <button
            onClick={() => navigate("/student-dashboard")}
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
            Browse Courses
          </button>
        </div>
      )}

      {/* Courses grid */}
      {!loading && !error && courses.length > 0 && (
        <div
          style={{
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          }}
        >
          {courses.map((course) => {
            const progressPercent = course.progress?.progressPercent || course.progress?.progress || 0;
            const status = course.progress?.status || "Not Started";
            const passedLessons = course.progress?.passedLessons || 0;
            const totalLessons = course.progress?.totalLessons || 0;

            return (
              <div
                key={course.id}
                onClick={() => handleCourseClick(course.id)}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  backgroundColor: "white",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.borderColor = "#3b82f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                }}
              >
                {/* Course Header */}
                <div style={{ marginBottom: "1rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "1.125rem",
                        fontWeight: "600",
                        color: "#0f172a",
                        flex: 1,
                        lineHeight: "1.4",
                      }}
                    >
                      {course.title}
                    </h4>
                    {status === "Completed" && (
                      <span
                        style={{
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "#dcfce7",
                          color: "#16a34a",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          whiteSpace: "nowrap",
                          marginLeft: "0.5rem",
                        }}
                      >
                        ✓ Completed
                      </span>
                    )}
                  </div>
                  {course.category && (
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.25rem 0.75rem",
                        backgroundColor: "#f1f5f9",
                        color: "#475569",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {course.category}
                    </span>
                  )}
                </div>

                {/* Description */}
                {course.description && (
                  <p
                    style={{
                      margin: "0 0 1rem 0",
                      color: "#64748b",
                      fontSize: "0.875rem",
                      lineHeight: "1.5",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {course.description}
                  </p>
                )}

                {/* Teacher Info */}
                <div style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "#64748b" }}>
                  <i className="fa-solid fa-user-tie" style={{ marginRight: "0.5rem" }}></i>
                  <span>{course.teacherName}</span>
                </div>

                {/* Progress Section */}
                {course.progress && (
                  <div
                    style={{
                      marginTop: "1rem",
                      paddingTop: "1rem",
                      borderTop: "1px solid #e2e8f0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span style={{ fontSize: "0.875rem", fontWeight: "500", color: "#334155" }}>
                        Progress
                      </span>
                      <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#3b82f6" }}>
                        {Math.round(progressPercent)}%
                      </span>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: "8px",
                        backgroundColor: "#e2e8f0",
                        borderRadius: "4px",
                        overflow: "hidden",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                          height: "100%",
                          backgroundColor:
                            status === "Completed"
                              ? "#22c55e"
                              : status === "In Progress"
                              ? "#3b82f6"
                              : "#94a3b8",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.75rem",
                        color: "#64748b",
                      }}
                    >
                      <span>
                        Status: <strong>{status}</strong>
                      </span>
                      {totalLessons > 0 && (
                        <span>
                          {passedLessons}/{totalLessons} lessons
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* View Course Button */}
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCourseClick(course.id);
                      }}
                      style={{
                        flex: 1,
                        padding: "0.75rem",
                        backgroundColor: "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#2563eb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#3b82f6";
                      }}
                    >
                      <span>View Course</span>
                      <i className="fa-solid fa-arrow-right"></i>
                    </button>
                    
                    {/* Archive button - only show for completed courses */}
                    {status === "Completed" && (
                      <button
                        onClick={(e) => handleArchive(e, course.id, course.title)}
                        disabled={archivingId === course.id}
                        title="Archive this completed course"
                        style={{
                          padding: "0.75rem",
                          backgroundColor: archivingId === course.id ? "#94a3b8" : "#f1f5f9",
                          color: archivingId === course.id ? "#fff" : "#64748b",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          fontSize: "0.875rem",
                          cursor: archivingId === course.id ? "not-allowed" : "pointer",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onMouseEnter={(e) => {
                          if (archivingId !== course.id) {
                            e.currentTarget.style.backgroundColor = "#e2e8f0";
                            e.currentTarget.style.color = "#475569";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (archivingId !== course.id) {
                            e.currentTarget.style.backgroundColor = "#f1f5f9";
                            e.currentTarget.style.color = "#64748b";
                          }
                        }}
                      >
                        {archivingId === course.id ? (
                          <i className="fa-solid fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fa-solid fa-box-archive"></i>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StudentPageLayout>
  );
}
