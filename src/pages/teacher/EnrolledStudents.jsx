import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/TeacherDashboard.css";
import {
  teacherGetEnrolledStudents,
  teacherGetMyCourses,
} from "../../services/api";

const EnrolledStudents = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [studentsData, coursesData] = await Promise.all([
        teacherGetEnrolledStudents().catch((err) => {
          console.error("Error loading enrolled students:", err);
          return { students: [], courses: [] };
        }),
        teacherGetMyCourses().catch((err) => {
          console.error("Error loading courses:", err);
          return { courses: [] };
        }),
      ]);

      setStudents(Array.isArray(studentsData?.students) ? studentsData.students : []);
      
      // Use courses from enrolled students if available, otherwise use from courses endpoint
      if (Array.isArray(studentsData?.courses) && studentsData.courses.length > 0) {
        setCourses(studentsData.courses);
      } else if (Array.isArray(coursesData?.courses)) {
        setCourses(coursesData.courses);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    let filtered = students;

    if (selectedCourse !== "all") {
      filtered = filtered.filter((s) =>
        s.courses.some((c) => {
          const courseId = String(c.courseId || c._id || "");
          const selectedId = String(selectedCourse);
          return courseId === selectedId;
        })
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          (s.studentName || "").toLowerCase().includes(term) ||
          s.courses.some((c) =>
            (c.courseName || "").toLowerCase().includes(term)
          )
      );
    }

    return filtered;
  }, [students, selectedCourse, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: students.length,
      active: students.filter((s) => s.courses.some((c) => c.status === "Ongoing")).length,
      completed: students.filter((s) => s.completedCourses > 0).length,
    };
  }, [students]);

  return (
    <div className="teacher-content-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Enrolled Students</h2>
          <p className="page-subtitle">View and track student progress across your courses</p>
        </div>
        <button className="btn-secondary" onClick={loadData}>
          <i className="fa-solid fa-rotate"></i> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-blue">
          <div className="stat-icon">
            <i className="fa-solid fa-users"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Students</div>
          </div>
        </div>

        <div className="stat-card stat-green">
          <div className="stat-icon">
            <i className="fa-solid fa-user-check"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Active Students</div>
          </div>
        </div>

        <div className="stat-card stat-purple">
          <div className="stat-icon">
            <i className="fa-solid fa-trophy"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Completed Courses</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>
            <i className="fa-solid fa-filter"></i> Filter by Course:
          </label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Courses</option>
            {courses.map((c) => {
              const courseId = String(c._id || c.id || "");
              return (
                <option key={courseId} value={courseId}>
                  {c.title || "Untitled Course"}
                </option>
              );
            })}
          </select>
        </div>

        <div className="search-bar">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="clear-search"
              onClick={() => setSearchTerm("")}
            >
              <i className="fa-solid fa-times"></i>
            </button>
          )}
        </div>
      </div>

      {/* Students Table */}
      {loading ? (
        <div className="loading-state">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <span>Loading students...</span>
        </div>
      ) : error ? (
        <div className="error-state">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>{error}</span>
          <button onClick={loadData} className="btn-retry">
            Retry
          </button>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-users"></i>
          <h3>No students found</h3>
          <p>
            {searchTerm || selectedCourse !== "all"
              ? "Try adjusting your filters"
              : "No students have enrolled in your courses yet"}
          </p>
        </div>
      ) : (
        <div className="students-table-container">
          <table className="students-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Enrolled Courses</th>
                <th>Progress</th>
                <th>Completed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const avgProgress =
                  student.courses.length > 0
                    ? Math.round(student.totalProgress / student.courses.length)
                    : 0;

                return (
                  <tr key={student.studentId}>
                    <td>
                      <div className="student-name-cell">
                        <div className="student-avatar">
                          {(student.studentName || "S")[0].toUpperCase()}
                        </div>
                        <span>{student.studentName}</span>
                      </div>
                    </td>
                    <td>
                      <div className="courses-list">
                        {student.courses.map((course, idx) => (
                          <span key={idx} className="course-tag">
                            {course.courseName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="progress-cell">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${avgProgress}%` }}
                          ></div>
                        </div>
                        <span className="progress-text">{avgProgress}%</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge-completed">
                        {student.completedCourses} / {student.courses.length}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-icon"
                        onClick={() =>
                          navigate(`/teacher/student/${student.studentId}`)
                        }
                        title="View Details"
                      >
                        <i className="fa-solid fa-eye"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EnrolledStudents;
