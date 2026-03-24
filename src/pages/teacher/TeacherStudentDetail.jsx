// src/pages/teacher/TeacherStudentDetail.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../../styles/TeacherDashboard.css";
import TeacherSidebar from "./TeacherSidebar";
import NavbarAfterLogin from "./NavbarAfterLogin";
import { teacherGetEnrolledStudents } from "../../services/api";
import StudentAvatar from "../../components/teacher/StudentAvatar";

const idStr = (v) => {
  if (v == null) return "";
  if (typeof v === "object" && v._id != null) return String(v._id);
  return String(v);
};

export default function TeacherStudentDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("enrolled-students");

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = useMemo(() => {
    try {
      const raw =
        localStorage.getItem("bs_user") || sessionStorage.getItem("bs_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const loadStudent = useCallback(async () => {
    if (!studentId) {
      setError("Missing student id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await teacherGetEnrolledStudents();
      const list = Array.isArray(data?.students) ? data.students : [];
      const found = list.find((s) => idStr(s.studentId) === idStr(studentId));
      if (!found) {
        setStudent(null);
        setError("This student is not enrolled in any of your courses, or the link is invalid.");
      } else {
        setStudent(found);
      }
    } catch (e) {
      setError(e?.message || "Failed to load student");
      setStudent(null);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  const avgProgress = useMemo(() => {
    if (!student?.courses?.length) return 0;
    return Math.round(student.totalProgress / student.courses.length);
  }, [student]);

  return (
    <div className="teacher-dashboard-layout">
      <NavbarAfterLogin user={user} />

      <div className="teacher-body">
        <TeacherSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="teacher-content">
          <div className="teacher-content-page tsd-page">
            <div className="page-header">
              <div>
                <h2 className="page-title">Student overview</h2>
                <p className="page-subtitle">
                  Progress across your courses for this learner
                </p>
              </div>
              <div className="tsd-header-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigate("/teacher/enrolled-students")}
                >
                  <i className="fa-solid fa-arrow-left" /> Back to list
                </button>
                <button type="button" className="btn-secondary" onClick={loadStudent}>
                  <i className="fa-solid fa-rotate" /> Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="loading-state">
                <i className="fa-solid fa-spinner fa-spin" />
                <span>Loading student…</span>
              </div>
            ) : error ? (
              <div className="error-state">
                <i className="fa-solid fa-triangle-exclamation" />
                <span>{error}</span>
                <button type="button" className="btn-retry" onClick={loadStudent}>
                  Retry
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigate("/teacher/enrolled-students")}
                >
                  Back to enrolled students
                </button>
              </div>
            ) : student ? (
              <>
                <div className="tsd-profile-card">
                  <StudentAvatar
                    className="student-avatar tsd-avatar-lg"
                    profileImage={student.profileImage}
                    name={student.studentName}
                  />
                  <div className="tsd-profile-main">
                    <h3 className="tsd-name">{student.studentName || "Student"}</h3>
                    {student.email ? (
                      <a className="tsd-email" href={`mailto:${student.email}`}>
                        {student.email}
                      </a>
                    ) : (
                      <p className="tsd-muted">No email on file</p>
                    )}
                    <div className="tsd-stats-row">
                      <span>
                        <strong>{student.courses?.length || 0}</strong> enrolled course
                        {student.courses?.length !== 1 ? "s" : ""}
                      </span>
                      <span className="tsd-dot">·</span>
                      <span>
                        <strong>{student.completedCourses || 0}</strong> completed
                      </span>
                      <span className="tsd-dot">·</span>
                      <span>
                        Avg. progress <strong>{avgProgress}%</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="students-table-container tsd-table-wrap">
                  <h4 className="tsd-section-title">Courses &amp; progress</h4>
                  <table className="students-table">
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Status</th>
                        <th>Progress</th>
                        <th>Enrolled</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(student.courses || []).map((c, idx) => {
                        const cid = idStr(c.courseId);
                        const pct = Number(c.progressPercent) || 0;
                        return (
                          <tr key={`${cid}-${idx}`}>
                            <td>{c.courseName || "Course"}</td>
                            <td>
                              <span
                                className={
                                  c.status === "Completed"
                                    ? "badge-completed"
                                    : "tsd-badge-ongoing"
                                }
                              >
                                {c.status || "—"}
                              </span>
                            </td>
                            <td>
                              <div className="progress-cell">
                                <div className="progress-bar">
                                  <div
                                    className="progress-fill"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="progress-text">{pct}%</span>
                              </div>
                            </td>
                            <td className="tsd-date">
                              {c.enrolledAt
                                ? new Date(c.enrolledAt).toLocaleDateString()
                                : "—"}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn-secondary tsd-btn-table"
                                onClick={() => navigate(`/course-detail/${cid}`)}
                              >
                                Manage course
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
