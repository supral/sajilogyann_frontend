import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/landing.css";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const COURSE_ENDPOINTS = ["/api/v1/courses", "/api/courses", "/api/public/home"];

const extractCourses = (data) => {
  if (!data) return [];
  if (Array.isArray(data.courses)) return data.courses;
  if (Array.isArray(data.data?.courses)) return data.data.courses;
  if (Array.isArray(data.data?.latestCourses)) return data.data.latestCourses;
  if (Array.isArray(data.latestCourses)) return data.latestCourses;
  return [];
};

const Courses = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get("category") || "";
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const filteredCourses = useMemo(() => {
    if (!categoryFilter) return courses;
    return courses.filter(
      (c) => String(c?.category || "").toLowerCase() === categoryFilter.toLowerCase()
    );
  }, [courses, categoryFilter]);

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
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            lastErr = new Error(data?.message || `Request failed (${res.status})`);
            continue;
          }
          const list = extractCourses(data);
          const sorted = [...list].sort((a, b) => {
            const da = new Date(a?.createdAt || 0).getTime();
            const db = new Date(b?.createdAt || 0).getTime();
            return db - da;
          });
          setCourses(sorted);
          setLoading(false);
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

  return (
    <>
      <Navbar />
      <section className="courses-section" style={{ padding: "2rem 2rem 4rem", maxWidth: 1200, margin: "0 auto" }}>
        <div className="section-header">
          <h2>Browse <span className="gradient-text">Courses</span></h2>
          <p>
            {categoryFilter
              ? `Courses in: ${categoryFilter}`
              : "Explore all courses. Click to view details and enroll."}
          </p>
          {categoryFilter && (
            <button
              type="button"
              onClick={() => navigate("/courses")}
              style={{ marginTop: 8, padding: "6px 12px", cursor: "pointer" }}
            >
              Clear filter
            </button>
          )}
        </div>
        {loading && <div className="loading-state">Loading courses...</div>}
        {error && <div className="error-state">{error}</div>}
        {!loading && !error && filteredCourses.length === 0 && (
          <div className="empty-state">
            <p>{categoryFilter ? `No courses in "${categoryFilter}".` : "No courses available yet."}</p>
            {categoryFilter && (
              <button type="button" onClick={() => navigate("/courses")}>View all courses</button>
            )}
          </div>
        )}
        <div className="course-cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
          {!loading && !error && filteredCourses.map((course) => {
            const count = course.lessons?.length || course.chapters?.length || 0;
            return (
              <div className="course-card" key={course._id}>
                <div className="course-info">
                  <div className="course-header">
                    <span className="badge">FREE</span>
                  </div>
                  <h4>{course.title}</h4>
                  <p className="instructor">
                    <i className="fa-solid fa-user-tie"></i> {course.teacherName || course.instructorName || "Instructor"}
                  </p>
                  <div className="course-meta-info">
                    <span className="meta-badge"><i className="fa-solid fa-book"></i> {count} lessons</span>
                    {course.category && <span className="meta-badge"><i className="fa-solid fa-tag"></i> {course.category}</span>}
                  </div>
                  <button className="view-btn" onClick={() => navigate(`/course/${course._id}`)}>
                    <span>View Course</span>
                    <i className="fa-solid fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <Footer />
    </>
  );
};

export default Courses;
