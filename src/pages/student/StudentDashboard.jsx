// src/pages/student/StudentDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import StudentNavbar from "./StudentNavbar";
import Footer from "../../components/Footer";
import { buildProfileImageUrl } from "../../utils/profileImageUrl.js";
import "../../styles/dashboard.css";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const COURSE_LIST_ENDPOINTS = ["/api/courses", "/api/v1/courses"];
const ENROLLED_COURSES_ENDPOINTS = ["/api/v1/students/enrolled-courses", "/api/students/enrolled-courses"];
const ENROLL_ENDPOINTS = ["/api/v1/students/courses", "/api/students/courses"];

/* =========================
   Helpers
========================= */
async function fetchWithTimeout(url, options = {}, timeoutMs = 7000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

const safeJson = async (res) => {
  try {
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    return await res.json();
  } catch {
    return null;
  }
};

const safeText = (v) => {
  if (v === null || v === undefined) return "";
  return String(v).trim();
};

const prettyDuration = (val) => {
  const s = safeText(val);
  if (!s) return "";
  if (/[a-zA-Z]/.test(s)) return s;
  const n = Number(s);
  if (!Number.isNaN(n)) return n === 1 ? "1 Week" : `${n} Weeks`;
  return s;
};

/**
 * ✅ Normalize course fields from ANY backend naming
 */
const normalizeCourse = (c = {}) => {
  const id = c?._id || c?.id || c?.courseId || "";

  const title =
    c?.title ||
    c?.name ||
    c?.courseName ||
    c?.course_title ||
    c?.course ||
    "Untitled Course";

  const level =
    c?.level ||
    c?.courseLevel ||
    c?.programLevel ||
    c?.semester ||
    c?.year ||
    "";

  const description =
    c?.description ||
    c?.desc ||
    c?.overview ||
    c?.summary ||
    c?.about ||
    "";

  const faculty =
    c?.faculty ||
    c?.program ||
    c?.department ||
    c?.facultyProgram ||
    c?.school ||
    c?.institution ||
    "";

  const category =
    c?.category ||
    c?.courseCategory ||
    c?.subject ||
    c?.topic ||
    "";

  const creditHour =
    c?.creditHour ||
    c?.creditHours ||
    c?.credits ||
    c?.credit ||
    "";

  const duration = prettyDuration(
    c?.duration || c?.durationText || c?.time || c?.weeks || c?.months
  );

  const schedule = safeText(c?.schedule || c?.days || c?.timing || "");
  const mode = safeText(c?.mode || c?.delivery || c?.learningMode || "");

  return {
    id: String(id),
    title: safeText(title) || "Untitled Course",
    level: safeText(level),
    description: safeText(description),
    faculty: safeText(faculty),
    category: safeText(category),
    creditHour: safeText(creditHour),
    duration: safeText(duration),
    schedule,
    mode,
    progress: c?.progress, // Preserve progress data
    raw: c,
  };
};

const buildMetaChips = (course) => {
  const chips = [];
  if (course.category) chips.push({ label: "Category", value: course.category });
  if (course.level) chips.push({ label: "Level", value: course.level });
  if (course.creditHour)
    chips.push({ label: "Credit Hr", value: course.creditHour });
  if (course.duration) chips.push({ label: "Time", value: course.duration });
  if (course.mode) chips.push({ label: "Mode", value: course.mode });
  if (course.schedule) chips.push({ label: "Schedule", value: course.schedule });
  return chips.slice(0, 4);
};

const EnrolledSkeleton = () => (
  <div className="en-card en-skeleton" aria-hidden="true">
    <div className="en-card-body">
      <div className="en-top" style={{ marginBottom: "14px" }}>
        <div className="en-sk" style={{ width: "80px", height: "24px", borderRadius: "6px" }} />
        <div className="en-sk" style={{ width: "60px", height: "24px", borderRadius: "6px" }} />
      </div>

      <div className="en-sk" style={{ width: "90%", height: "20px", marginBottom: "10px", borderRadius: "6px" }} />
      <div className="en-sk" style={{ width: "100%", height: "14px", marginBottom: "6px", borderRadius: "6px" }} />
      <div className="en-sk" style={{ width: "70%", height: "14px", marginBottom: "16px", borderRadius: "6px" }} />

      <div style={{ display: "flex", gap: "8px", paddingTop: "12px", borderTop: "1px solid rgba(15, 23, 42, 0.06)" }}>
        <div className="en-sk" style={{ width: "100px", height: "32px", borderRadius: "8px" }} />
        <div className="en-sk" style={{ width: "80px", height: "32px", borderRadius: "8px" }} />
      </div>
    </div>

    <div className="en-footer">
      <div className="en-sk" style={{ width: "80px", height: "16px", borderRadius: "6px" }} />
      <div className="en-sk" style={{ width: "100px", height: "36px", borderRadius: "10px" }} />
    </div>
  </div>
);

const StudentDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [courses, setCourses] = useState([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState(new Set());
  const [enrolledCourses, setEnrolledCourses] = useState([]); // Full enrolled courses data
  const [firstLoading, setFirstLoading] = useState(true);
  const [error, setError] = useState("");
  const [enrollingId, setEnrollingId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [dashboardProfileUser, setDashboardProfileUser] = useState(() => {
    try {
      const raw =
        localStorage.getItem("bs_user") || sessionStorage.getItem("bs_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [profileDetailOpen, setProfileDetailOpen] = useState(false);
  const [heroAvatarBroken, setHeroAvatarBroken] = useState(false);

  // Close sidebar on route change (mobile only - below 768px)
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Ensure sidebar is always visible on desktop/tablet (above 768px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(false); // Close overlay, sidebar will be visible via CSS
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Check on mount

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sidebar menu items configuration
  const sidebarMenuItems = [
    {
      label: "Activity log",
      icon: "fa-clock-rotate-left",
      path: "/student/activity-log",
    },
    { 
      label: "Enrolled Courses", 
      icon: "fa-book-open", 
      path: "/student/enrolled-courses" 
    },
    { 
      label: "Archived Courses", 
      icon: "fa-box-archive", 
      path: "/student/archived-courses" 
    },
    { 
      label: "Assignments", 
      icon: "fa-clipboard-list", 
      path: "/student/assignments" 
    },
    { 
      label: "Progress Tracker", 
      icon: "fa-chart-line", 
      path: "/student/progress-tracker" 
    },
    { 
      label: "Practice Quizzes", 
      icon: "fa-question-circle", 
      path: "/student/practice-quizzes" 
    },
    { 
      label: "Certificates", 
      icon: "fa-certificate", 
      path: "/student/certificates" 
    },
    { 
      label: "Notifications", 
      icon: "fa-bell", 
      path: "/student/notifications" 
    },
  ];

  const token =
    localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

  const studentDisplayName = (
    dashboardProfileUser?.name ||
    dashboardProfileUser?.fullName ||
    ""
  ).trim();

  const heroProfileImageUrl = useMemo(
    () => buildProfileImageUrl(API_HOST, dashboardProfileUser?.profileImage),
    [dashboardProfileUser?.profileImage]
  );

  const heroInitials = useMemo(() => {
    const n = (studentDisplayName || "S").trim();
    const parts = n.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "S";
    const b = parts.length > 1 ? parts[1]?.[0] : "";
    return (a + b).toUpperCase();
  }, [studentDisplayName]);

  useEffect(() => {
    setHeroAvatarBroken(false);
  }, [dashboardProfileUser?.profileImage]);

  useEffect(() => {
    if (!profileDetailOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setProfileDetailOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profileDetailOpen]);

  useEffect(() => {
    if (!token) {
      setDashboardProfileUser(null);
      return;
    }

    let cancelled = false;

    const mergeStorageWithProfile = (profile) => {
      const raw =
        localStorage.getItem("bs_user") ||
        sessionStorage.getItem("bs_user") ||
        "{}";
      let base = {};
      try {
        base = JSON.parse(raw);
      } catch {
        base = {};
      }
      const merged = {
        ...base,
        ...profile,
        role: base.role || "student",
        profileImage: profile.profileImage || base.profileImage || "",
      };
      if (localStorage.getItem("bs_token")) {
        localStorage.setItem("bs_user", JSON.stringify(merged));
      } else if (sessionStorage.getItem("bs_token")) {
        sessionStorage.setItem("bs_user", JSON.stringify(merged));
      }
      return merged;
    };

    const logoutSession = () => {
      localStorage.removeItem("bs_token");
      localStorage.removeItem("bs_user");
      sessionStorage.removeItem("bs_token");
      sessionStorage.removeItem("bs_user");
      ["bs_role", "userRole", "role"].forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });
      navigate("/", { replace: true });
    };

    const run = async () => {
      const urls = [
        `${API_HOST}/api/v1/students/me/profile`,
        `${API_HOST}/api/students/me/profile`,
      ];
      for (const url of urls) {
        try {
          const res = await fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });
          if (res.status === 401) {
            logoutSession();
            return;
          }
          if (!res.ok) continue;
          const data = await safeJson(res);
          const profile = data?.profile;
          if (!profile || typeof profile !== "object" || cancelled) return;
          const merged = mergeStorageWithProfile(profile);
          window.dispatchEvent(
            new CustomEvent("bs-user-updated", { detail: merged })
          );
          setDashboardProfileUser(merged);
          return;
        } catch {
          /* try next URL */
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  const didFetchRef = useRef(false);
  const lastGoodCoursesRef = useRef([]);

  const loadEnrolledCourses = async () => {
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
    const enrolledIds = new Set();
    const enrolledList = [];

    for (const ep of ENROLLED_COURSES_ENDPOINTS) {
      const url = `${API_HOST}${ep}`;
      try {
        const res = await fetchWithTimeout(
          url,
          { method: "GET", headers: { Accept: "application/json", ...authHeader } },
          7000
        );

        if (!res.ok) continue;

        const data = await res.json();
        const list = Array.isArray(data?.courses)
          ? data.courses
          : Array.isArray(data)
          ? data
          : [];

        list.forEach((c) => {
          const id = c?._id || c?.courseId || c?.id;
          if (id) {
            enrolledIds.add(String(id));
            enrolledList.push(c); // Store full course data
          }
        });

        setEnrolledCourseIds(enrolledIds);
        setEnrolledCourses(enrolledList); // Store full enrolled courses
        return;
      } catch {
        // try next endpoint
      }
    }
  };

  const loadCourses = async () => {
    setError("");
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

    // Load all available courses
    for (const ep of COURSE_LIST_ENDPOINTS) {
      const url = `${API_HOST}${ep}`;
      try {
        const res = await fetchWithTimeout(
          url,
          { method: "GET", headers: { Accept: "application/json", ...authHeader } },
          7000
        );

        if (!res.ok) continue;

        const data = await res.json();
        const list = Array.isArray(data?.courses)
          ? data.courses
          : Array.isArray(data?.data?.courses)
          ? data.data.courses
          : Array.isArray(data)
          ? data
          : [];

        lastGoodCoursesRef.current = list;
        setCourses(list);
        setFirstLoading(false);
        
        // Also load enrolled courses to know which are enrolled
        await loadEnrolledCourses();
        return;
      } catch {
        // try next endpoint
      }
    }

    setCourses(lastGoodCoursesRef.current || []);
    setFirstLoading(false);
    setError("Could not load courses. Please make sure backend is running.");
  };

  const handleEnroll = async (courseId, courseTitle, e) => {
    e.stopPropagation(); // Prevent card click from navigating
    e.preventDefault(); // Prevent any default behavior
    
    // Prevent multiple clicks on the same course
    if (enrollingId === courseId) return;
    
    // Check if already enrolled
    if (enrolledCourseIds.has(String(courseId))) {
      alert(`You are already enrolled in "${courseTitle}"`);
      return;
    }

    try {
      setEnrollingId(courseId);
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

      // Try enrollment endpoints
      let enrolled = false;
      for (const ep of ENROLL_ENDPOINTS) {
        const url = `${API_HOST}${ep}/${courseId}/enroll`;
        try {
          const res = await fetchWithTimeout(
            url,
            { method: "POST", headers: { Accept: "application/json", ...authHeader } },
            10000
          );

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            if (res.status === 409) {
              // Already enrolled
              alert(data?.message || `Already enrolled in "${courseTitle}"`);
              await loadEnrolledCourses();
              enrolled = true;
              return;
            }
            // Try next endpoint
            continue;
          }

          const data = await res.json();
          
          // Success - update state immediately
          setEnrolledCourseIds((prev) => {
            const newSet = new Set(prev);
            newSet.add(String(courseId));
            return newSet;
          });
          
          // Refresh enrolled courses list to get latest data
          await loadEnrolledCourses();
          
          alert(data?.message || `Successfully enrolled in "${courseTitle}"!`);
          enrolled = true;
          return;
        } catch (err) {
          console.error(`Enrollment error for course ${courseId}:`, err);
          if (err.name === "AbortError") {
            alert("Request timed out. Please try again.");
            return;
          }
          // Continue to next endpoint
        }
      }

      if (!enrolled) {
        alert(`Failed to enroll in "${courseTitle}". Please try again.`);
      }
    } catch (err) {
      console.error("Enrollment error:", err);
      alert(`Failed to enroll in "${courseTitle}". Please try again.`);
    } finally {
      setEnrollingId(null);
    }
  };

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    loadCourses();
    loadEnrolledCourses(); // Also load enrolled courses on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get category from URL query parameter
  const categoryFilter = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("category") || null;
  }, [location.search]);

  const visibleCourses = useMemo(() => {
    const list = Array.isArray(courses) ? courses : [];
    let normalized = list.map(normalizeCourse).filter((c) => c.id);
    
    // Filter by category if category is selected
    if (categoryFilter) {
      normalized = normalized.filter((c) => {
        const courseCategory = (c.category || "").toLowerCase().trim();
        const filterCategory = categoryFilter.toLowerCase().trim();
        return courseCategory === filterCategory;
      });
    }
    
    return normalized;
  }, [courses, categoryFilter]);

  const goDetail = (id) => navigate(`/student/course/${id}`);

  // ✅ Dashboard top stats (UI only, no backend change)
  const stats = useMemo(() => {
    const totalCourses = visibleCourses.length;
    const completed = totalCourses ? Math.max(1, Math.floor(totalCourses * 0.25)) : 0;
    const progress = totalCourses ? Math.min(95, 35 + totalCourses * 8) : 0;
    const enrolledCount = enrolledCourseIds.size;

    return {
      totalCourses,
      completed,
      progress,
      enrolledCount,
    };
  }, [visibleCourses.length, enrolledCourseIds.size]);

  return (
    <>
      <StudentNavbar
        user={dashboardProfileUser || undefined}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <section
        className="sd-page"
        style={{
          background:
            "radial-gradient(1200px 600px at 10% 0%, rgba(59,130,246,0.10), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(16,185,129,0.08), transparent 55%)",
        }}
      >
        <div className="sd-container">
          {/* Top heading */}
          <div className="sd-hero">
            <div className="sd-hero-main">
              <button
                type="button"
                className="dash-hero-avatar-btn"
                onClick={() => setProfileDetailOpen(true)}
                aria-label="View your profile details"
              >
                {heroProfileImageUrl && !heroAvatarBroken ? (
                  <img
                    src={heroProfileImageUrl}
                    alt=""
                    className="dash-hero-avatar-img"
                    onError={() => setHeroAvatarBroken(true)}
                  />
                ) : (
                  <span className="dash-hero-avatar-initials">{heroInitials}</span>
                )}
              </button>
              <div className="sd-hero-copy">
                <h2 className="sd-title">
                  {studentDisplayName
                    ? `Welcome back, ${studentDisplayName}`
                    : "Welcome to Your Learning Dashboard"}
                </h2>
                <p className="sd-subtitle">
                  Explore courses posted by teachers, track progress, and continue learning.
                </p>
              </div>
            </div>
          </div>

          <div className="sd-layout">
            {/* Sidebar */}
            <aside className={`sd-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
              <button 
                className="sd-sideBtn active"
                onClick={() => {
                  navigate("/student-dashboard");
                  if (window.innerWidth <= 768) {
                    setSidebarOpen(false);
                  }
                }}
              >
                <i className="fa-solid fa-chart-line" /> My Learning
              </button>

              <ul className="sd-sideList">
                {sidebarMenuItems.map((item, index) => {
                  const isActive = location.pathname === item.path || 
                    location.pathname.startsWith(item.path + "/");
                  return (
                    <li
                      key={item.path}
                      className={isActive ? "active" : ""}
                      onClick={() => {
                        navigate(item.path);
                        // Close sidebar on mobile only (below 768px) when navigating
                        if (window.innerWidth <= 768) {
                          setSidebarOpen(false);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(item.path);
                          if (window.innerWidth <= 768) {
                            setSidebarOpen(false);
                          }
                        }
                      }}
                    >
                      <i className={`fa-solid ${item.icon}`}></i> {item.label}
                    </li>
                  );
                })}
              </ul>

              {/* Enrolled Courses Section — same theme as .sd-sideList li */}
              {enrolledCourses.length > 0 && (
                <div className="sd-sideSection">
                  <div className="sd-sideSectionTitle">Enrolled Courses</div>
                  <ul className="sd-sideEnrolledList">
                    {enrolledCourses.map((course) => {
                      const courseId = course?._id || course?.courseId || course?.id;
                      const courseTitle =
                        course?.title || course?.courseName || course?.name || "Untitled Course";
                      const isActiveCourse =
                        location.pathname === `/student/course/${courseId}` ||
                        location.pathname.startsWith(`/student/course/${courseId}/`);

                      return (
                        <li
                          key={courseId}
                          className={`sd-sideEnrolledItem${isActiveCourse ? " active" : ""}`}
                          onClick={() => {
                            navigate(`/student/course/${courseId}`);
                            if (window.innerWidth <= 768) {
                              setSidebarOpen(false);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              navigate(`/student/course/${courseId}`);
                              if (window.innerWidth <= 768) {
                                setSidebarOpen(false);
                              }
                            }
                          }}
                        >
                          <i className="fa-solid fa-book sd-sideEnrolledIcon" aria-hidden />
                          <span className="sd-sideEnrolledTitle">{courseTitle}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {enrolledCourses.length === 0 && !firstLoading && (
                <div className="sd-sideSection">
                  <div className="sd-sideSectionTitle">Enrolled Courses</div>
                  <p className="sd-sideSectionEmpty">No enrolled courses yet</p>
                </div>
              )}
            </aside>

            {/* Main */}
            <main className="sd-main">
              {/* ✅ NEW: Stats row (Image-style cards) */}
              <div className="sd-stats">
                <div className="sd-statCard c1" onClick={() => navigate("/student/enrolled-courses")}>
                  <div className="sd-statTop">
                    <span className="sd-statIcon"><i className="fa-solid fa-book-open" /></span>
                    <span className="sd-statLabel">Available Courses</span>
                  </div>
                  <div className="sd-statValue">{stats.totalCourses}</div>
                  <div className="sd-statSub">Browse & Enroll</div>
                </div>

                <div className="sd-statCard c2" onClick={() => navigate("/student/enrolled-courses")}>
                  <div className="sd-statTop">
                    <span className="sd-statIcon"><i className="fa-solid fa-user-graduate" /></span>
                    <span className="sd-statLabel">Enrolled</span>
                  </div>
                  <div className="sd-statValue">{stats.enrolledCount}</div>
                  <div className="sd-statSub">Active Enrollments</div>
                </div>

                <div className="sd-statCard c3" onClick={() => navigate("/student/profile")}>
                  <div className="sd-statTop">
                    <span className="sd-statIcon"><i className="fa-solid fa-circle-check" /></span>
                    <span className="sd-statLabel">Completed</span>
                  </div>
                  <div className="sd-statValue">{stats.completed}</div>
                  <div className="sd-statSub">Finished Courses</div>
                </div>

                <div className="sd-statCard c4" onClick={() => navigate("/student/profile")}>
                  <div className="sd-statTop">
                    <span className="sd-statIcon"><i className="fa-solid fa-chart-line" /></span>
                    <span className="sd-statLabel">Progress</span>
                  </div>
                  <div className="sd-statValue">{stats.progress}%</div>
                  <div className="sd-statSub">Learning Completion</div>
                </div>
              </div>

              {/* ✅ REMOVED: Pro+ banner بالكامل */}

              {/* Courses Header */}
              <div className="en-head">
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <h3 className="section-subtitle" style={{ margin: 0 }}>
                    {categoryFilter ? `Courses: ${categoryFilter}` : "Available Courses"}
                  </h3>
                  {categoryFilter && (
                    <button
                      type="button"
                      onClick={() => navigate("/student-dashboard")}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#f1f5f9",
                        color: "#475569",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#e2e8f0";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#f1f5f9";
                      }}
                    >
                      <i className="fa-solid fa-times" style={{ fontSize: "0.75rem" }} />
                      Clear Filter
                    </button>
                  )}
                </div>

                <button type="button" onClick={loadCourses} className="en-refresh">
                  <span aria-hidden="true">↻</span> Refresh
                </button>
              </div>

              {error ? <div className="en-alert">{error}</div> : null}

              {/* Cards */}
              <div className="en-grid">
                {firstLoading ? (
                  <>
                    <EnrolledSkeleton />
                    <EnrolledSkeleton />
                    <EnrolledSkeleton />
                    <EnrolledSkeleton />
                  </>
                ) : visibleCourses.length === 0 ? (
                  <div className="en-empty">
                    <div className="en-empty-ic">📚</div>
                    <div>
                      {categoryFilter 
                        ? `No courses found in "${categoryFilter}" category.` 
                        : "No courses posted yet."}
                    </div>
                    {categoryFilter && (
                      <button
                        type="button"
                        onClick={() => navigate("/student-dashboard")}
                        style={{
                          marginTop: "12px",
                          padding: "8px 16px",
                          backgroundColor: "#072e5c",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        View All Courses
                      </button>
                    )}
                  </div>
                ) : (
                  visibleCourses.map((course) => {
                    const chips = buildMetaChips(course);
                    const isEnrolled = enrolledCourseIds.has(course.id);
                    const isEnrolling = enrollingId === course.id;

                    return (
                      <div
                        key={course.id}
                        className="en-card"
                        role="button"
                        tabIndex={0}
                        onClick={() => goDetail(course.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            goDetail(course.id);
                          }
                        }}
                        title="Open course detail"
                      >
                        {/* Card Body */}
                        <div className="en-card-body">
                          {/* Tags */}
                          <div className="en-top">
                            <div className="en-subline">
                              <span className="en-subtag en-subtag-category">
                                {course.category || "General"}
                              </span>
                              {course.level && (
                                <span className="en-subtag en-subtag-level">
                                  {course.level}
                                </span>
                              )}
                              {isEnrolled && (
                                <span className="en-subtag en-subtag-enrolled">
                                  <i className="fa-solid fa-check" style={{ fontSize: "10px" }}></i> Enrolled
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Title */}
                          <div className="en-title-wrap">
                            <h3 className="en-title">{course.title}</h3>
                          </div>

                          {/* Description */}
                          <p className="en-desc">
                            {course.description || "No description available."}
                          </p>

                          {/* Meta Chips */}
                          <div className="en-chip-row">
                            {chips.length > 0 ? (
                              chips.slice(0, 3).map((c, idx) => (
                                <span className="en-chip" key={`${c.label}-${idx}`}>
                                  <b>{c.label}:</b> {c.value}
                                </span>
                              ))
                            ) : (
                              <span className="en-chip en-chip-muted">
                                <i className="fa-solid fa-info-circle"></i> No extra details
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="en-footer">
                          <button
                            className="en-view-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              goDetail(course.id);
                            }}
                          >
                            <span>View Details</span>
                            <i className="fa-solid fa-arrow-right"></i>
                          </button>
                          {!isEnrolled ? (
                            <button
                              className="en-enroll-btn"
                              onClick={(e) => handleEnroll(course.id, course.title, e)}
                              disabled={isEnrolling}
                              title={`Enroll in ${course.title}`}
                            >
                              {isEnrolling ? (
                                <>
                                  <i className="fa-solid fa-spinner fa-spin"></i> Enrolling...
                                </>
                              ) : (
                                <>
                                  <i className="fa-solid fa-plus"></i> Enroll Now
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="en-enrolled-badge">
                              <i className="fa-solid fa-check-circle"></i> Enrolled
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </main>
          </div>
        </div>
      </section>

      {/* Learning path (your section) */}
      <section className="learning-path-section">
        <h2>Your Learning Path</h2>
        <p>Choose a path that aligns with your academic goals and career aspirations.</p>

        <div className="learning-path-grid">
          <div className="path-card">
            <h3><i className="fa-solid fa-graduation-cap"></i> Core Courses</h3>
            <p>Complete your mandatory curriculum efficiently.</p>
            <hr />
            <ul>
              <li>✔ Structured modules by semester</li>
              <li>✔ Interactive assignments</li>
            </ul>
            <button>View Courses</button>
          </div>

          <div className="path-card">
            <h3><i className="fa-solid fa-flask"></i> Skill Development</h3>
            <p>Learn technical & soft skills relevant to your field.</p>
            <hr />
            <ul>
              <li>✔ Hands-on labs & projects</li>
              <li>✔ Certification opportunities</li>
            </ul>
            <button>Explore Skills</button>
          </div>

          <div className="path-card">
            <h3><i className="fa-solid fa-briefcase"></i> Career Growth</h3>
            <p>Prepare for internships and real-world challenges.</p>
            <hr />
            <ul>
              <li>✔ Resume-building workshops</li>
              <li>✔ Mock interviews & mentorship</li>
            </ul>
            <button>Start Journey</button>
          </div>
        </div>
      </section>

      {profileDetailOpen && (
        <div
          className="dash-profile-modal-overlay"
          role="presentation"
          onClick={() => setProfileDetailOpen(false)}
        >
          <div
            className="dash-profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dash-student-profile-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="dash-profile-modal-close"
              aria-label="Close"
              onClick={() => setProfileDetailOpen(false)}
            >
              ×
            </button>
            <div className="dash-profile-modal-avatar-wrap">
              {heroProfileImageUrl && !heroAvatarBroken ? (
                <img
                  src={heroProfileImageUrl}
                  alt=""
                  className="dash-profile-modal-avatar"
                  onError={() => setHeroAvatarBroken(true)}
                />
              ) : (
                <span className="dash-profile-modal-avatar dash-profile-modal-avatar--initials">
                  {heroInitials}
                </span>
              )}
            </div>
            <h2 id="dash-student-profile-title" className="dash-profile-modal-title">
              Your details
            </h2>
            <dl className="dash-profile-modal-dl">
              <div>
                <dt>Name</dt>
                <dd>{studentDisplayName || "—"}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{safeText(dashboardProfileUser?.email) || "—"}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{safeText(dashboardProfileUser?.phone) || "—"}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>Student</dd>
              </div>
            </dl>
            <button
              type="button"
              className="dash-profile-modal-primary"
              onClick={() => {
                setProfileDetailOpen(false);
                navigate("/student/profile");
              }}
            >
              Open full profile
            </button>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
};

export default StudentDashboard;
