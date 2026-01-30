import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/TeacherDashboard.css";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

const MyCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      const res = await fetch(`${API_HOST}/api/teacher/courses`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load courses");
      }

      const data = await res.json();
      setCourses(Array.isArray(data?.courses) ? data.courses : []);
    } catch (err) {
      setError(err?.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return courses;
    const term = searchTerm.toLowerCase();
    return courses.filter(
      (c) =>
        (c.title || "").toLowerCase().includes(term) ||
        (c.description || "").toLowerCase().includes(term) ||
        (c.category || "").toLowerCase().includes(term)
    );
  }, [courses, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: courses.length,
      published: courses.filter((c) => c.isPublished !== false).length,
      drafts: courses.filter((c) => c.isPublished === false).length,
    };
  }, [courses]);

  return (
    <div className="teacher-content-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">My Courses</h2>
          <p className="page-subtitle">Manage and track all your created courses</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate("/create-course")}
        >
          <i className="fa-solid fa-plus"></i> Create New Course
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-blue">
          <div className="stat-icon">
            <i className="fa-solid fa-book-open"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Courses</div>
          </div>
        </div>

        <div className="stat-card stat-green">
          <div className="stat-icon">
            <i className="fa-solid fa-check-circle"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.published}</div>
            <div className="stat-label">Published</div>
          </div>
        </div>

        <div className="stat-card stat-orange">
          <div className="stat-icon">
            <i className="fa-solid fa-file-lines"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.drafts}</div>
            <div className="stat-label">Drafts</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <i className="fa-solid fa-magnifying-glass"></i>
        <input
          type="text"
          placeholder="Search courses by title, description, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            className="clear-search"
            onClick={() => setSearchTerm("")}
            title="Clear search"
          >
            <i className="fa-solid fa-times"></i>
          </button>
        )}
      </div>

      {/* Courses List */}
      {loading ? (
        <div className="loading-state">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <span>Loading courses...</span>
        </div>
      ) : error ? (
        <div className="error-state">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>{error}</span>
          <button onClick={loadCourses} className="btn-retry">
            Retry
          </button>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-book-open"></i>
          <h3>
            {searchTerm ? "No courses found" : "No courses yet"}
          </h3>
          <p>
            {searchTerm
              ? "Try adjusting your search terms"
              : "Create your first course to get started"}
          </p>
          {!searchTerm && (
            <button
              className="btn-primary"
              onClick={() => navigate("/create-course")}
            >
              <i className="fa-solid fa-plus"></i> Create Course
            </button>
          )}
        </div>
      ) : (
        <div className="courses-grid">
          {filteredCourses.map((course) => (
            <div
              key={course._id || course.id}
              className="course-card"
              onClick={() => navigate(`/course-detail/${course._id || course.id}`)}
            >
              <div className="course-card-header">
                <div className="course-badge">
                  {course.isPublished !== false ? (
                    <span className="badge-published">
                      <i className="fa-solid fa-check"></i> Published
                    </span>
                  ) : (
                    <span className="badge-draft">
                      <i className="fa-solid fa-file-lines"></i> Draft
                    </span>
                  )}
                </div>
                {course.category && (
                  <span className="course-category">{course.category}</span>
                )}
              </div>

              <h3 className="course-title">{course.title || "Untitled Course"}</h3>
              <p className="course-description">
                {course.description || "No description available"}
              </p>

              <div className="course-meta">
                {course.duration && (
                  <span className="meta-item">
                    <i className="fa-solid fa-clock"></i> {course.duration}
                  </span>
                )}
                {course.level && (
                  <span className="meta-item">
                    <i className="fa-solid fa-signal"></i> {course.level}
                  </span>
                )}
              </div>

              <div className="course-footer">
                <button
                  className="btn-view"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/course-detail/${course._id || course.id}`);
                  }}
                >
                  View Details <i className="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCourses;
