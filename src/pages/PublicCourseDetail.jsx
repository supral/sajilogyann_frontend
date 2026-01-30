import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/landing.css";
import "../styles/PublicCourseDetail.css";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const PublicCourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCourse = async () => {
      setLoading(true);
      setError("");

      const endpoints = [
        `/api/v1/courses/${id}`,
        `/api/courses/${id}`,
      ];

      let lastErr = null;

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(`${API_HOST}${endpoint}`, {
            headers: { Accept: "application/json" },
          });

          const data = await res.json();

          if (!res.ok) {
            lastErr = new Error(data?.message || `Request failed (${res.status})`);
            continue;
          }

          const courseData = data?.course || data?.data?.course || data;
          if (courseData) {
            setCourse(courseData);
            setLoading(false);
            return;
          }
        } catch (e) {
          lastErr = e;
        }
      }

      setLoading(false);
      setError(lastErr?.message || "Failed to load course details");
    };

    if (id) {
      fetchCourse();
    }
  }, [id]);

  const handleLoginRedirect = () => {
    navigate("/login", { state: { from: { pathname: `/student/courses/${id}` } } });
  };

  const lessonsCount = course?.lessons?.length || course?.chapters?.length || 0;

  return (
    <>
      <Navbar />

      <div className="public-course-detail-container">
        <div className="public-course-detail-content">
          {loading ? (
            <div className="public-course-loading">
              <div className="loading-spinner"></div>
              <p>Loading course details...</p>
            </div>
          ) : error ? (
            <div className="public-course-error">
              <i className="fa-solid fa-circle-exclamation"></i>
              <h2>Course Not Found</h2>
              <p>{error}</p>
              <Link to="/" className="back-to-home-btn">
                <i className="fa-solid fa-arrow-left"></i> Back to Home
              </Link>
            </div>
          ) : !course ? (
            <div className="public-course-error">
              <i className="fa-solid fa-circle-exclamation"></i>
              <h2>Course Not Found</h2>
              <p>The course you're looking for doesn't exist.</p>
              <Link to="/" className="back-to-home-btn">
                <i className="fa-solid fa-arrow-left"></i> Back to Home
              </Link>
            </div>
          ) : (
            <>
              {/* Course Header */}
              <div className="public-course-header">
                <Link to="/" className="back-link">
                  <i className="fa-solid fa-arrow-left"></i> Back to Courses
                </Link>
                <div className="course-badge">FREE</div>
                <h1 className="course-title">{course.title}</h1>
                <div className="course-meta">
                  <span className="meta-item">
                    <i className="fa-solid fa-user-tie"></i>
                    {course.teacherName || course.instructorName || "Instructor"}
                  </span>
                  <span className="meta-item">
                    <i className="fa-solid fa-book"></i>
                    {lessonsCount} {lessonsCount === 1 ? "Lesson" : "Lessons"}
                  </span>
                  {course.category && (
                    <span className="meta-item">
                      <i className="fa-solid fa-tag"></i>
                      {course.category}
                    </span>
                  )}
                  {course.duration && (
                    <span className="meta-item">
                      <i className="fa-solid fa-clock"></i>
                      {course.duration}
                    </span>
                  )}
                </div>
              </div>

              {/* Course Description */}
              <div className="public-course-description">
                <h2>About This Course</h2>
                {course.description ? (
                  <p className="description-text">{course.description}</p>
                ) : (
                  <p className="description-text no-description">
                    No description available for this course.
                  </p>
                )}
              </div>

              {/* Login Prompt */}
              <div className="public-course-login-prompt">
                <div className="login-prompt-icon">
                  <i className="fa-solid fa-lock"></i>
                </div>
                <h3>Want to Access Full Course Content?</h3>
                <p>
                  For further information, course materials, lessons, MCQs, and certificates, 
                  please log in to your account.
                </p>
                <button 
                  className="login-redirect-btn"
                  onClick={handleLoginRedirect}
                >
                  <i className="fa-solid fa-sign-in-alt"></i>
                  Login to Continue
                </button>
                <p className="no-account-text">
                  Don't have an account?{" "}
                  <Link to="/register" className="register-link">
                    Sign up for free
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
};

export default PublicCourseDetail;
