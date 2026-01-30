// src/pages/student/Assignments.jsx
import React, { useEffect, useState } from "react";
import StudentPageLayout from "./StudentPageLayout";
import { useNavigate } from "react-router-dom";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_PREFIXES = ["/api/v1", "/api"];

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const token = getToken();

        for (const p of API_PREFIXES) {
          const res = await fetch(`${API_HOST}${p}/students/assignments`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setAssignments(data?.assignments || []);
            break;
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  const getFileUrl = (file) => {
    if (!file?.path) return "";
    if (file.path.startsWith("http")) return file.path;
    return `${API_HOST}${file.path.startsWith("/") ? "" : "/"}${file.path}`;
  };

  return (
    <StudentPageLayout title="Assignments" activePath="/student/assignments">
      {loading && <p>Loading assignments...</p>}

      {!loading && assignments.length === 0 && (
        <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
          <p>No assignments found.</p>
          <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
            Assignments will appear here when your enrolled courses have tasks.
          </p>
        </div>
      )}

      {!loading && assignments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {assignments.map((assignment) => (
            <div
              key={assignment._id}
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                padding: "1.5rem",
                backgroundColor: "#fff",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: "0 0 0.5rem 0", color: "#333" }}>
                    {assignment.chapterName || assignment.lessonName || "Untitled Assignment"}
                  </h3>
                  <p style={{ margin: "0 0 0.5rem 0", color: "#666", fontSize: "0.875rem" }}>
                    Course: <strong>{assignment.courseTitle}</strong>
                  </p>
                  {assignment.description && (
                    <p style={{ margin: "0.5rem 0", color: "#555" }}>{assignment.description}</p>
                  )}
                </div>
                <span
                  style={{
                    padding: "0.25rem 0.75rem",
                    backgroundColor: assignment.type === "chapter" ? "#e3f2fd" : "#f3e5f5",
                    color: assignment.type === "chapter" ? "#1976d2" : "#7b1fa2",
                    borderRadius: "12px",
                    fontSize: "0.75rem",
                    fontWeight: "500",
                    textTransform: "uppercase",
                  }}
                >
                  {assignment.type}
                </span>
              </div>

              {assignment.taskFiles && assignment.taskFiles.length > 0 && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e0e0e0" }}>
                  <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", fontWeight: "600", color: "#666" }}>
                    Task Files ({assignment.taskFiles.length}):
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {assignment.taskFiles.map((file, idx) => (
                      <a
                        key={idx}
                        href={getFileUrl(file)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem",
                          backgroundColor: "#f5f5f5",
                          borderRadius: "4px",
                          textDecoration: "none",
                          color: "#1976d2",
                          transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e3f2fd")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
                      >
                        <i className="fa-solid fa-file" style={{ fontSize: "0.875rem" }} />
                        <span style={{ fontSize: "0.875rem" }}>
                          {file.originalName || file.fileName || `Task File ${idx + 1}`}
                        </span>
                        {file.size && (
                          <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#999" }}>
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e0e0e0" }}>
                <button
                  onClick={() => navigate(`/student/course/${assignment.courseId}`)}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#1976d2",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1565c0")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1976d2")}
                >
                  View Course
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </StudentPageLayout>
  );
}
