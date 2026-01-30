import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/NavbarAfterLogin.css"; // ✅ reuse same css if you want
import { useAppLogo } from "../hooks/useAppLogo.js";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_PREFIXES = ["/api", "/api/v1"];

const CATEGORY_ENDPOINT_CANDIDATES = [
  "/courses/categories",
  "/categories",
  "/course-categories",
  "/courses",
  "/teacher/courses",
];

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

const getUser = () => {
  try {
    const raw =
      localStorage.getItem("bs_user") || sessionStorage.getItem("bs_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const safeJson = async (res) => {
  try {
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const [browseOpen, setBrowseOpen] = useState(false);
  const browseRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);


  const token = getToken();
  const isLoggedIn = Boolean(token);

  const user = useMemo(() => getUser(), [token]);

  const role = user?.role || "student";
  const displayName = user?.name || user?.fullName || "Profile";

  const dashboardPath =
    role === "admin"
      ? "/admin-dashboard"
      : role === "teacher"
      ? "/teacher-dashboard"
      : "/student-dashboard";

  const profilePath =
    role === "teacher"
      ? "/teacher-profile"
      : role === "admin"
      ? "/admin-profile"
      : "/student/profile";


  const logout = () => {
    localStorage.removeItem("bs_token");
    localStorage.removeItem("bs_user");
    sessionStorage.removeItem("bs_token");
    sessionStorage.removeItem("bs_user");
    setProfileOpen(false);
    setBrowseOpen(false);
    navigate("/", { replace: true });
  };

  // close menus on route change
  useEffect(() => {
    setProfileOpen(false);
    setBrowseOpen(false);
  }, [location.pathname]);

  // close menus on outside click and ESC key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (browseRef.current && !browseRef.current.contains(e.target)) {
        setBrowseOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setProfileOpen(false);
        setBrowseOpen(false);
      }
    };

    const handleTouchStart = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (browseRef.current && !browseRef.current.contains(e.target)) {
        setBrowseOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("touchstart", handleTouchStart);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("touchstart", handleTouchStart);
    };
  }, []);

  /* ============================
     Fetch categories for Browse
     ============================ */
  const fetchCategories = async () => {
    setCatLoading(true);
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      for (const prefix of API_PREFIXES) {
        for (const path of CATEGORY_ENDPOINT_CANDIDATES) {
          const url = `${API_HOST}${prefix}${path}`;

          try {
            const res = await fetch(url, {
              method: "GET",
              headers: { Accept: "application/json", ...authHeader },
            });
            if (!res.ok) continue;

            const data = await safeJson(res);
            if (!data) continue;

            const list1 = Array.isArray(data?.categories) ? data.categories : null;
            const list2 = Array.isArray(data?.data) ? data.data : null;

            const courses =
              Array.isArray(data?.courses)
                ? data.courses
                : Array.isArray(data)
                ? data
                : null;

            let cats = [];

            if (list1) {
              cats = list1;
            } else if (list2 && list2.every((x) => typeof x === "string")) {
              cats = list2;
            } else if (courses) {
              const set = new Set();
              courses.forEach((c) => {
                const v = (c?.category || c?.courseCategory || "").toString().trim();
                if (v) set.add(v);
              });
              cats = Array.from(set);
            }

            cats = (cats || [])
              .map((x) => (typeof x === "string" ? x.trim() : ""))
              .filter(Boolean)
              .slice(0, 40);

            if (cats.length) {
              setCategories(cats);
              return;
            }
          } catch {
            // ignore
          }
        }
      }

      setCategories([]);
    } finally {
      setCatLoading(false);
    }
  };

  const toggleBrowse = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const next = !browseOpen;
    setBrowseOpen(next);

    if (next && categories.length === 0 && !catLoading) {
      await fetchCategories();
    }
  };

  const onPickCategory = (cat) => {
    setBrowseOpen(false);
    // Navigate to landing page and scroll to courses section
    navigate(`/?category=${encodeURIComponent(cat)}`);
    // Scroll to courses section after navigation
    setTimeout(() => {
      const coursesSection = document.querySelector('.courses-section');
      if (coursesSection) {
        coursesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };


  // Optional initials
  const initials = useMemo(() => {
    const parts = String(displayName || "P").trim().split(" ");
    const a = parts[0]?.[0] || "P";
    const b = parts.length > 1 ? parts[1]?.[0] : "";
    return (a + b).toUpperCase();
  }, [displayName]);

  // ✅ Get app logo
  const { logoUrl } = useAppLogo();

  return (
    <header className="tnav">
      {/* LEFT */}
      <div className="tnav__left">
        <div
          className="tnav__brand"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="tnav__logo"
              style={{
                width: "32px",
                height: "32px",
                objectFit: "contain",
                borderRadius: "10px",
              }}
              onError={(e) => {
                // Fallback to text if image fails to load
                e.target.style.display = "none";
                if (!e.target.nextSibling) {
                  const textLogo = document.createElement("span");
                  textLogo.className = "tnav__logo";
                  textLogo.textContent = "SG";
                  e.target.parentNode.insertBefore(textLogo, e.target);
                }
              }}
            />
          ) : (
            <span className="tnav__logo">SG</span>
          )}
          <span className="tnav__title">Sajilo Gyann</span>
        </div>

        {/* Browse */}
        <div ref={browseRef} style={{ position: "relative" }}>
          <button
            type="button"
            className={`tnav__btn tnav__btn--browse ${browseOpen ? "active" : ""}`}
            onClick={toggleBrowse}
          >
            <i className="fa-solid fa-compass" />
            <span>Browse</span>
            <i className={`fa-solid fa-chevron-down ${browseOpen ? "rotated" : ""}`} />
          </button>

          {browseOpen && (
            <div className="tnav__menu tnav__browseMenu">
              <div className="tnav__menuHeader">
                <i className="fa-solid fa-layer-group" />
                <span>Browse Categories</span>
              </div>

              <div className="tnav__divider" />

              {catLoading ? (
                <div className="tnav__menuLoading">
                  <i className="fa-solid fa-spinner fa-spin" />
                  <span>Loading categories...</span>
                </div>
              ) : categories.length ? (
                <div className="tnav__menuList">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className="tnav__menuBtn"
                      onClick={() => onPickCategory(cat)}
                    >
                      <i className="fa-solid fa-book" />
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="tnav__menuEmpty">
                  <i className="fa-solid fa-inbox" />
                  <span>No categories found</span>
                  <small>Ensure your courses have a category field</small>
                </div>
              )}

              <div className="tnav__divider" />

              <button
                type="button"
                className="tnav__menuBtn tnav__menuBtn--primary"
                onClick={() => {
                  setBrowseOpen(false);
                  navigate("/");
                  // Scroll to courses section
                  setTimeout(() => {
                    const coursesSection = document.querySelector('.courses-section');
                    if (coursesSection) {
                      coursesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 100);
                }}
              >
                <i className="fa-solid fa-graduation-cap" />
                <span>View All Courses</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* CENTER */}
      <div className="tnav__center">
        {isLoggedIn ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span className="tnav__welcomeText">
              Welcome, <span className="tnav__userName">{displayName}</span>
            </span>


          </div>
        ) : (
          <span className="tnav__welcomeText">Welcome to Sajilo Gyann</span>
        )}
      </div>

      {/* RIGHT */}
      <div className="tnav__right">
        <button
          type="button"
          className="tnav__btn tnav__btn--ghost"
          onClick={() => navigate("/student/how-to-get-certificate")}
        >
          <i className="fa-solid fa-certificate" />
          <span>How to Get Certificates</span>
        </button>

        {!isLoggedIn ? (
          <Link to="/login" className="tnav__btn tnav__btn--primary">
            Login
          </Link>
        ) : (
          <div className="tnav__profile" ref={profileRef}>
            <button
              type="button"
              className="tnav__iconBtn"
              onClick={() => setProfileOpen((v) => !v)}
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
            >
              <span className="tnav__iconCircle" style={{ position: "relative" }}>
                <span className="tnav__initials">{initials}</span>
                <span className="tnav__dot" title="Online" />
              </span>
              <span className={`tnav__caret ${profileOpen ? "rot" : ""}`}>▾</span>
            </button>

            {profileOpen && (
              <div className="tnav__menu">
                <Link to={dashboardPath} onClick={() => setProfileOpen(false)}>
                  <span className="tnav__mi">📊</span> Dashboard
                </Link>

                <Link to={profilePath} onClick={() => setProfileOpen(false)}>
                  <span className="tnav__mi">👤</span> View Profile
                </Link>

              

                <div className="tnav__divider" />

                <button type="button" className="tnav__logout" onClick={logout}>
                  <span className="tnav__mi">🚪</span> Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
