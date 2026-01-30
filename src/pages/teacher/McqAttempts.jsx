import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/TeacherDashboard.css";
import {
  teacherGetMcqAttempts,
  teacherGetMyCourses,
} from "../../services/api";

const McqAttempts = () => {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedResult, setSelectedResult] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [attemptsData, coursesData] = await Promise.all([
        teacherGetMcqAttempts().catch((err) => {
          console.error("Error loading MCQ attempts:", err);
          return { attempts: [], courses: [] };
        }),
        teacherGetMyCourses().catch((err) => {
          console.error("Error loading courses:", err);
          return { courses: [] };
        }),
      ]);

      setAttempts(Array.isArray(attemptsData?.attempts) ? attemptsData.attempts : []);

      // Use courses from attempts if available, otherwise use from courses endpoint
      if (Array.isArray(attemptsData?.courses) && attemptsData.courses.length > 0) {
        setCourses(attemptsData.courses);
      } else if (Array.isArray(coursesData?.courses)) {
        setCourses(coursesData.courses);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err?.message || "Failed to load MCQ attempts");
    } finally {
      setLoading(false);
    }
  };

  const filteredAttempts = useMemo(() => {
    let filtered = attempts;

    if (selectedCourse !== "all") {
      filtered = filtered.filter((a) => {
        const courseId = String(a.courseId || a._id || "");
        const selectedId = String(selectedCourse);
        return courseId === selectedId;
      });
    }

    if (selectedResult !== "all") {
      filtered = filtered.filter((a) => a.result === selectedResult);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          (a.studentName || "").toLowerCase().includes(term) ||
          (a.courseName || "").toLowerCase().includes(term) ||
          (a.chapterName || "").toLowerCase().includes(term)
      );
    }

    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [attempts, selectedCourse, selectedResult, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: attempts.length,
      passed: attempts.filter((a) => a.result === "pass").length,
      failed: attempts.filter((a) => a.result === "fail").length,
      avgScore:
        attempts.length > 0
          ? Math.round(
              (attempts.reduce((sum, a) => {
                const percent =
                  a.totalMarks > 0
                    ? (a.marksObtained / a.totalMarks) * 100
                    : 0;
                return sum + percent;
              }, 0) /
                attempts.length) *
                100
            ) / 100
          : 0,
    };
  }, [attempts]);

  const getScorePercent = (attempt) => {
    if (!attempt.totalMarks || attempt.totalMarks === 0) return 0;
    return Math.round((attempt.marksObtained / attempt.totalMarks) * 100);
  };

  return (
    <div className="teacher-content-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">MCQ Attempts</h2>
          <p className="page-subtitle">Monitor and analyze student MCQ performance</p>
        </div>
        <button className="btn-secondary" onClick={loadData}>
          <i className="fa-solid fa-rotate"></i> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-blue">
          <div className="stat-icon">
            <i className="fa-solid fa-clipboard-list"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Attempts</div>
          </div>
        </div>

        <div className="stat-card stat-green">
          <div className="stat-icon">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.passed}</div>
            <div className="stat-label">Passed</div>
          </div>
        </div>

        <div className="stat-card stat-red">
          <div className="stat-icon">
            <i className="fa-solid fa-circle-xmark"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.failed}</div>
            <div className="stat-label">Failed</div>
          </div>
        </div>

        <div className="stat-card stat-purple">
          <div className="stat-icon">
            <i className="fa-solid fa-chart-line"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.avgScore}%</div>
            <div className="stat-label">Average Score</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>
            <i className="fa-solid fa-filter"></i> Course:
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

        <div className="filter-group">
          <label>
            <i className="fa-solid fa-filter"></i> Result:
          </label>
          <select
            value={selectedResult}
            onChange={(e) => setSelectedResult(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Results</option>
            <option value="pass">Passed</option>
            <option value="fail">Failed</option>
          </select>
        </div>

        <div className="search-bar">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            placeholder="Search by student, course, or chapter..."
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

      {/* Attempts Table */}
      {loading ? (
        <div className="loading-state">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <span>Loading attempts...</span>
        </div>
      ) : error ? (
        <div className="error-state">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>{error}</span>
          <button onClick={loadData} className="btn-retry">
            Retry
          </button>
        </div>
      ) : filteredAttempts.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-clipboard-list"></i>
          <h3>No attempts found</h3>
          <p>
            {searchTerm || selectedCourse !== "all" || selectedResult !== "all"
              ? "Try adjusting your filters"
              : "No students have attempted MCQs in your courses yet"}
          </p>
        </div>
      ) : (
        <div className="attempts-table-container">
          <table className="attempts-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Course</th>
                <th>Chapter/Lesson</th>
                <th>Score</th>
                <th>Result</th>
                <th>Attempt #</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttempts.map((attempt, idx) => {
                const scorePercent = getScorePercent(attempt);
                return (
                  <tr key={attempt._id || attempt.id || idx}>
                    <td>
                      <div className="student-name-cell">
                        <div className="student-avatar">
                          {(attempt.studentName || "S")[0].toUpperCase()}
                        </div>
                        <span>{attempt.studentName || "Student"}</span>
                      </div>
                    </td>
                    <td>{attempt.courseName || "Course"}</td>
                    <td>{attempt.chapterName || attempt.lessonName || "—"}</td>
                    <td>
                      <div className="score-cell">
                        <span className="score-value">
                          {attempt.marksObtained || 0} / {attempt.totalMarks || 0}
                        </span>
                        <span className="score-percent">({scorePercent}%)</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          attempt.result === "pass" ? "badge-success" : "badge-danger"
                        }`}
                      >
                        {attempt.result === "pass" ? (
                          <>
                            <i className="fa-solid fa-check"></i> Pass
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-xmark"></i> Fail
                          </>
                        )}
                      </span>
                    </td>
                    <td>
                      <span className="attempt-number">
                        #{attempt.attemptNo || attempt.attempt || 1}
                      </span>
                    </td>
                    <td>
                      {attempt.createdAt
                        ? new Date(attempt.createdAt).toLocaleDateString()
                        : "—"}
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

export default McqAttempts;
