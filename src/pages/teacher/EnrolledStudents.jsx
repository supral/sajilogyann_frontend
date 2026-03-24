import React, { useEffect, useState, useMemo } from "react";
import "../../styles/TeacherDashboard.css";
import {
  teacherGetEnrolledStudents,
  teacherGetMyCourses,
} from "../../services/api";
import StudentAvatar from "../../components/teacher/StudentAvatar";
import ListPaginationBar from "../../components/ListPaginationBar";
import { useListPagination } from "../../hooks/useListPagination";

const ENROLLED_STUDENTS_PAGE_SIZE = 10;

const courseIdStr = (c) => {
  if (!c?.courseId) return "";
  if (typeof c.courseId === "object" && c.courseId._id != null) {
    return String(c.courseId._id);
  }
  return String(c.courseId);
};

const EnrolledStudents = () => {
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
          const cid = courseIdStr(c);
          const selectedId = String(selectedCourse);
          return cid === selectedId;
        })
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          (s.studentName || "").toLowerCase().includes(term) ||
          s.courses.some((c) => (c.courseName || "").toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [students, selectedCourse, searchTerm]);

  const {
    page: studentPage,
    setPage: setStudentPage,
    totalPages: studentTotalPages,
    pageItems: pagedStudents,
    total: studentListTotal,
    from: studentFrom,
    to: studentTo,
  } = useListPagination(filteredStudents, {
    pageSize: ENROLLED_STUDENTS_PAGE_SIZE,
    resetDeps: [selectedCourse, searchTerm],
  });

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

      {!loading && !error && students.length > 0 && (
        <p className="teacher-dashboard-metrics-line enrolled-metrics-line" aria-live="polite">
          <span>
            <strong>{stats.total}</strong> students
          </span>
          <span className="teacher-dashboard-metrics-sep" aria-hidden>
            ·
          </span>
          <span>
            <strong>{stats.active}</strong> active
          </span>
          <span className="teacher-dashboard-metrics-sep" aria-hidden>
            ·
          </span>
          <span>
            <strong>{stats.completed}</strong> with completed course(s)
          </span>
        </p>
      )}

      <div className="stats-grid stats-grid--kpi-row">
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
            <button className="clear-search" onClick={() => setSearchTerm("")}>
              <i className="fa-solid fa-times"></i>
            </button>
          )}
        </div>
      </div>

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
      ) : studentListTotal === 0 ? (
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
          <ListPaginationBar
            page={studentPage}
            totalPages={studentTotalPages}
            onPageChange={setStudentPage}
            from={studentFrom}
            to={studentTo}
            total={studentListTotal}
            flushTop
          />
          <table className="students-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Enrolled Courses</th>
                <th>Progress</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {pagedStudents.map((student) => {
                const avgProgress =
                  student.courses.length > 0
                    ? Math.round(student.totalProgress / student.courses.length)
                    : 0;

                return (
                  <tr key={student.studentId}>
                    <td>
                      <div className="student-name-cell">
                        <StudentAvatar
                          profileImage={student.profileImage}
                          name={student.studentName}
                        />
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
                  </tr>
                );
              })}
            </tbody>
          </table>
          <ListPaginationBar
            page={studentPage}
            totalPages={studentTotalPages}
            onPageChange={setStudentPage}
            from={studentFrom}
            to={studentTo}
            total={studentListTotal}
          />
        </div>
      )}
    </div>
  );
};

export default EnrolledStudents;
