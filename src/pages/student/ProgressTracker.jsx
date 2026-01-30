import React, { useEffect, useState, useMemo } from "react";
import StudentPageLayout from "./StudentPageLayout";
import { useNavigate } from "react-router-dom";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_PREFIXES = ["/api/v1", "/api"];

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

export default function ProgressTracker() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const token = getToken();
        for (const p of API_PREFIXES) {
          const res = await fetch(`${API_HOST}${p}/students/enrolled-courses`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setCourses(data?.courses || []);
            break;
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, []);

  // Calculate overall statistics
  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const completedCourses = courses.filter((c) => c.progress?.status === "Completed").length;
    const ongoingCourses = totalCourses - completedCourses;
    
    const totalProgress = courses.reduce((sum, c) => sum + (c.progress?.progressPercent || 0), 0);
    const avgProgress = totalCourses > 0 ? Math.round(totalProgress / totalCourses) : 0;
    
    const totalLessons = courses.reduce((sum, c) => sum + (c.progress?.totalLessons || 0), 0);
    const completedLessons = courses.reduce((sum, c) => sum + (c.progress?.passedLessons || 0), 0);
    const overallCompletion = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      totalCourses,
      completedCourses,
      ongoingCourses,
      avgProgress,
      totalLessons,
      completedLessons,
      overallCompletion,
    };
  }, [courses]);

  const getProgressColor = (percent) => {
    if (percent >= 80) return "#4caf50"; // Green
    if (percent >= 50) return "#2196f3"; // Blue
    if (percent >= 25) return "#ff9800"; // Orange
    return "#f44336"; // Red
  };

  const getStatusBadgeStyle = (status) => {
    if (status === "Completed") {
      return {
        backgroundColor: "#e8f5e9",
        color: "#2e7d32",
        borderColor: "#4caf50",
      };
    }
    return {
      backgroundColor: "#e3f2fd",
      color: "#1565c0",
      borderColor: "#2196f3",
    };
  };

  return (
    <StudentPageLayout title="Progress Tracker" activePath="/student/progress-tracker">
      {loading && (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <p>Loading your progress...</p>
        </div>
      )}

      {!loading && courses.length === 0 && (
        <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
          <p>No enrolled courses found.</p>
          <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
            Start learning to track your progress!
          </p>
        </div>
      )}

      {!loading && courses.length > 0 && (
        <>
          {/* Overall Statistics Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginBottom: "2rem",
            }}
          >
            <div
              style={{
                backgroundColor: "#fff",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                padding: "1.5rem",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.5rem" }}>
                Total Courses
              </div>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#333" }}>
                {stats.totalCourses}
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#fff",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                padding: "1.5rem",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.5rem" }}>
                Completed
              </div>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#4caf50" }}>
                {stats.completedCourses}
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#fff",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                padding: "1.5rem",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.5rem" }}>
                In Progress
              </div>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#2196f3" }}>
                {stats.ongoingCourses}
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#fff",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                padding: "1.5rem",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.5rem" }}>
                Overall Progress
              </div>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: getProgressColor(stats.overallCompletion) }}>
                {stats.overallCompletion}%
              </div>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div
            style={{
              backgroundColor: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              padding: "1.5rem",
              marginBottom: "2rem",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, color: "#333" }}>Overall Learning Progress</h3>
              <span style={{ fontSize: "1.25rem", fontWeight: "bold", color: getProgressColor(stats.overallCompletion) }}>
                {stats.overallCompletion}%
              </span>
            </div>
            <div style={{ width: "100%", height: "16px", backgroundColor: "#e0e0e0", borderRadius: "8px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${stats.overallCompletion}%`,
                  height: "100%",
                  backgroundColor: getProgressColor(stats.overallCompletion),
                  transition: "width 0.3s ease",
                  borderRadius: "8px",
                }}
              />
            </div>
            <div style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "#666" }}>
              {stats.completedLessons} of {stats.totalLessons} lessons completed across all courses
            </div>
          </div>

          {/* Course-wise Progress */}
          <div style={{ marginBottom: "1rem" }}>
            <h2 style={{ margin: "0 0 1rem 0", color: "#333" }}>Course Progress</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {courses.map((course) => (
              <div
                key={course._id || course.courseId}
                style={{
                  backgroundColor: "#fff",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  padding: "1.5rem",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  transition: "box-shadow 0.2s",
                  cursor: "pointer",
                }}
                onClick={() => navigate(`/student/course/${course._id || course.courseId}`)}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: "0 0 0.5rem 0", color: "#333" }}>{course.title}</h3>
                    {course.description && (
                      <p style={{ margin: "0 0 0.5rem 0", color: "#666", fontSize: "0.875rem" }}>
                        {course.description.length > 150
                          ? `${course.description.substring(0, 150)}...`
                          : course.description}
                      </p>
                    )}
                    {course.category && (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "#f5f5f5",
                          color: "#666",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          marginTop: "0.5rem",
                        }}
                      >
                        {course.category}
                      </span>
                    )}
                  </div>
                  {course.progress?.status && (
                    <span
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "16px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        border: "1px solid",
                        ...getStatusBadgeStyle(course.progress.status),
                      }}
                    >
                      {course.progress.status}
                    </span>
                  )}
                </div>

                {course.progress && (
                  <>
                    <div style={{ marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.875rem", color: "#666", fontWeight: "500" }}>
                          Progress
                        </span>
                        <span
                          style={{
                            fontSize: "1rem",
                            fontWeight: "bold",
                            color: getProgressColor(course.progress.progressPercent),
                          }}
                        >
                          {course.progress.progressPercent}%
                        </span>
                      </div>
                      <div style={{ width: "100%", height: "12px", backgroundColor: "#e0e0e0", borderRadius: "6px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${course.progress.progressPercent}%`,
                            height: "100%",
                            backgroundColor: getProgressColor(course.progress.progressPercent),
                            transition: "width 0.3s ease",
                            borderRadius: "6px",
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "2rem", fontSize: "0.875rem", color: "#666" }}>
                      <div>
                        <span style={{ fontWeight: "500" }}>Lessons Completed: </span>
                        <span style={{ color: "#333", fontWeight: "600" }}>
                          {course.progress.passedLessons} / {course.progress.totalLessons}
                        </span>
                      </div>
                      {course.enrolledAt && (
                        <div>
                          <span style={{ fontWeight: "500" }}>Enrolled: </span>
                          <span style={{ color: "#333" }}>
                            {new Date(course.enrolledAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </StudentPageLayout>
  );
}
