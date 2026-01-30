import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/landing.css";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

// ✅ Try these endpoints (works with different backend setups)
const COURSE_ENDPOINTS = [
  "/api/v1/courses",         // preferred
  "/api/courses",            // fallback
  "/api/public/home",        // fallback (then use data.data.latestCourses)
];

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

// Extract courses from different response shapes
const extractCourses = (data) => {
  if (!data) return [];
  if (Array.isArray(data.courses)) return data.courses;
  if (Array.isArray(data.data?.courses)) return data.data.courses;
  if (Array.isArray(data.data?.latestCourses)) return data.data.latestCourses;
  if (Array.isArray(data.latestCourses)) return data.latestCourses;
  return [];
};


const LandingPage = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // sidebar selection + refs for scroll
  const [activeCourseId, setActiveCourseId] = useState(null);
  const cardRefs = useRef({}); // { [courseId]: element }
  
  // Intersection Observer for scroll animations
  const [visibleSections, setVisibleSections] = useState(new Set());
  const sectionRefs = useRef({});

  // Fetch all courses uploaded by teachers
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      let lastErr = null;

      for (const endpoint of COURSE_ENDPOINTS) {
        try {
          const res = await fetch(`${API_HOST}${endpoint}`, {
            headers: { Accept: "application/json" },
          });

          const data = await safeJson(res);
          if (!res.ok) {
            lastErr = new Error(data?.message || `Request failed (${res.status})`);
            continue;
          }

          const list = extractCourses(data);

          // ✅ sort newest first if createdAt exists
          const sorted = [...list].sort((a, b) => {
            const da = new Date(a?.createdAt || 0).getTime();
            const db = new Date(b?.createdAt || 0).getTime();
            return db - da;
          });

          setCourses(sorted);
          setLoading(false);

          // set default active course
          if (sorted[0]?._id) setActiveCourseId(sorted[0]._id);
          return;
        } catch (e) {
          lastErr = e;
        }
      }

      setLoading(false);
      setError(lastErr?.message || "Failed to load courses");
    };

    load();
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -100px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisibleSections((prev) => new Set([...prev, entry.target.id]));
        }
      });
    }, observerOptions);

    // Observe all sections
    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      Object.values(sectionRefs.current).forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [courses]);

  // Sidebar list: show all course titles
  const sidebarCourses = useMemo(() => courses, [courses]);

  const onPickSidebarCourse = (courseId) => {
    setActiveCourseId(courseId);

    const el = cardRefs.current[courseId];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <>
      <Navbar />

      {/* ===== HERO SECTION ===== */}
      <section className="hero-section" id="hero" ref={(el) => (sectionRefs.current.hero = el)}>
        <div className="hero-background-elements">
          <div className="floating-shape shape-1"></div>
          <div className="floating-shape shape-2"></div>
          <div className="floating-shape shape-3"></div>
        </div>
        <div className="hero-container">
          <div className={`hero-content ${visibleSections.has("hero") ? "fade-in-up" : ""}`}>
            <div className="hero-badge">
              <i className="fa-solid fa-graduation-cap"></i>
              <span>Learn from Industry Experts</span>
            </div>
            <h1>
              Transform Your Career with <span className="gradient-text">Expert-Led Courses</span>
            </h1>
            <p>
              Access industry-relevant courses designed by experienced teachers. 
              Learn at your own pace with structured chapters, interactive MCQs, 
              and comprehensive progress tracking.
            </p>
            <div className="hero-cta">
              <Link to="/register" className="cta-primary">
                <span>Get Started Free</span>
                <i className="fa-solid fa-arrow-right"></i>
              </Link>
              <button 
                className="cta-secondary"
                onClick={() => {
                  document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <i className="fa-solid fa-play"></i>
                <span>Explore Courses</span>
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">{courses.length}+</div>
                <div className="stat-label">Courses</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">100%</div>
                <div className="stat-label">Free Access</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">24/7</div>
                <div className="stat-label">Available</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== COURSES SECTION ===== */}
      <section className="courses-section" id="courses" ref={(el) => (sectionRefs.current.courses = el)}>
        <div className="section-header">
          <h2>Explore Our <span className="gradient-text">Course Catalog</span></h2>
          <p>
            Discover courses uploaded by expert teachers — learn chapter-by-chapter with MCQs and progress tracking.
          </p>
        </div>

        <div className="courses-container">
          {/* Sidebar */}
          <div className="courses-sidebar">
            <h3>Popular Courses</h3>

            {loading ? (
              <div className="sidebar-loading">Loading…</div>
            ) : error ? (
              <div className="sidebar-error">{error}</div>
            ) : sidebarCourses.length === 0 ? (
              <div className="sidebar-empty">No courses uploaded yet.</div>
            ) : (
              <ul>
                {sidebarCourses.map((c) => {
                  const isActive = String(activeCourseId) === String(c._id);
                  return (
                    <li
                      key={c._id}
                      onClick={() => onPickSidebarCourse(c._id)}
                      className={isActive ? "active" : ""}
                      title={c.title}
                    >
                      {c.title}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Main Courses Grid */}
          <div className="courses-main">
            <h3 className="section-subtitle">All Teacher Uploaded Courses</h3>

            {loading && <div className="loading-state">Loading courses...</div>}
            {error && <div className="error-state">{error}</div>}

            {!loading && !error && courses.length === 0 && (
              <div className="empty-state">
                <p>No courses uploaded by teachers yet.</p>
              </div>
            )}

            <div className="course-cards">
              {courses.map((course, index) => {
                const lessonsCount =
                  course.lessons?.length ||
                  course.chapters?.length ||
                  0;

                const isActive = String(activeCourseId) === String(course._id);

                return (
                  <div
                    className={`course-card ${isActive ? "active" : ""} ${visibleSections.has("courses") ? "fade-in-up" : ""}`}
                    key={course._id}
                    ref={(el) => (cardRefs.current[course._id] = el)}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="course-info">
                      <div className="course-header">
                        <span className="badge">FREE</span>
                        <p className="rating">
                          <i className="fa-solid fa-star"></i> 4.5
                        </p>
                      </div>
                      <h4>{course.title}</h4>
                      <p className="instructor">
                        <i className="fa-solid fa-user-tie"></i> {course.teacherName || course.instructorName || "Instructor"}
                      </p>
                      <div className="course-meta-info">
                        <span className="meta-badge">
                          <i className="fa-solid fa-book"></i> {lessonsCount} lessons
                        </span>
                        {course.category && (
                          <span className="meta-badge">
                            <i className="fa-solid fa-tag"></i> {course.category}
                          </span>
                        )}
                      </div>
                      <button
                        className="view-btn"
                        onClick={() => {
                          navigate(`/course/${course._id}`);
                        }}
                      >
                        <span>View Course</span>
                        <i className="fa-solid fa-arrow-right"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default LandingPage;
