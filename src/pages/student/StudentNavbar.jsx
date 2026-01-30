import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../../styles/NavbarAfterLogin.css";
import { useAppLogo } from "../../hooks/useAppLogo.js";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_PREFIXES = ["/api", "/api/v1"];

const safeJson = async (res) => {
  try {
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    return await res.json();
  } catch {
    return null;
  }
};

const StudentNavbar = ({ user: userProp, onMenuToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const [browseOpen, setBrowseOpen] = useState(false);
  const browseRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);

  const token =
    localStorage.getItem("bs_token") ||
    sessionStorage.getItem("bs_token");

  const user = useMemo(() => {
    if (userProp) return userProp;
    try {
      const raw =
        localStorage.getItem("bs_user") ||
        sessionStorage.getItem("bs_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [userProp, token]);

  const displayName = user?.name || user?.fullName || "Student";

  const profileImageUrl = useMemo(() => {
    const path = user?.profileImage || "";
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith("/")) return `${API_HOST}${path}`;
    return `${API_HOST}/${path}`;
  }, [user?.profileImage]);

  const initials = useMemo(() => {
    const parts = String(displayName || "S").trim().split(" ");
    const a = parts[0]?.[0] || "S";
    const b = parts.length > 1 ? parts[1]?.[0] : "";
    return (a + b).toUpperCase();
  }, [displayName]);

  // ✅ Get app logo
  const { logoUrl } = useAppLogo();

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

  // close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (browseRef.current && !browseRef.current.contains(e.target)) {
        setBrowseOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ============================
     Fetch categories for Browse
     ============================ */
  const fetchCategories = async () => {
    setCatLoading(true);

    try {
      // ✅ Try the dedicated categories endpoint first (both /api and /api/v1)
      for (const prefix of API_PREFIXES) {
        const url = `${API_HOST}${prefix}/categories`;
        
        try {
          const res = await fetch(url, {
            method: "GET",
            headers: { Accept: "application/json" },
          });
          
          if (res.ok) {
            const data = await safeJson(res);
            if (data?.categories && Array.isArray(data.categories)) {
              const cats = data.categories
                .map((x) => (typeof x === "string" ? x.trim() : ""))
                .filter(Boolean)
                .sort();
              
              if (cats.length > 0) {
                setCategories(cats);
                setCatLoading(false);
                return;
              }
            }
          }
        } catch {
          // Try next prefix
        }
      }

      // ✅ Fallback: Extract categories from courses
      for (const prefix of API_PREFIXES) {
        const url = `${API_HOST}${prefix}/courses`;
        
        try {
          const res = await fetch(url, {
            method: "GET",
            headers: { Accept: "application/json" },
          });
          
          if (res.ok) {
            const data = await safeJson(res);
            const courses = Array.isArray(data?.courses) 
              ? data.courses 
              : Array.isArray(data) 
              ? data 
              : [];
            
            if (courses.length > 0) {
              const categorySet = new Set();
              courses.forEach((c) => {
                const cat = (c?.category || c?.courseCategory || "").toString().trim();
                if (cat) categorySet.add(cat);
              });
              
              const cats = Array.from(categorySet).sort();
              if (cats.length > 0) {
                setCategories(cats);
                setCatLoading(false);
                return;
              }
            }
          }
        } catch {
          // Try next prefix
        }
      }

      // ✅ Final fallback: default categories
      setCategories(["Management", "IT"]);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setCategories(["Management", "IT"]);
    } finally {
      setCatLoading(false);
    }
  };

  const toggleBrowse = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const next = !browseOpen;
    setBrowseOpen(next);

    // ✅ Always refresh categories when opening Browse menu
    if (next && !catLoading) {
      await fetchCategories();
    }
  };

  const onPickCategory = (cat) => {
    setBrowseOpen(false);
    navigate(`/student-dashboard?category=${encodeURIComponent(cat)}`);
  };

  return (
    <header className="tnav">
      {/* LEFT */}
      <div className="tnav__left">
        {/* Hamburger Menu Button (Mobile) */}
        <button
          type="button"
          className="tnav__hamburger"
          onClick={() => onMenuToggle && onMenuToggle()}
          aria-label="Toggle sidebar menu"
        >
          <i className="fa-solid fa-bars"></i>
        </button>
        <div
          className="tnav__brand"
          onClick={() => navigate("/student-dashboard")}
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
            className={`tnav__btn tnav__btn--browse ${browseOpen ? "active" : ""} ${
              location.pathname === "/student-dashboard" || location.search.includes("category=") ? "is-active" : ""
            }`}
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
                  navigate("/student-dashboard");
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
        <span className="tnav__welcomeText">
          Welcome, <span className="tnav__userName">{displayName}</span>
        </span>
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

        <div className="tnav__profile" ref={profileRef}>
          <button
            type="button"
            className="tnav__iconBtn"
            onClick={() => setProfileOpen((v) => !v)}
            aria-label="Open profile menu"
            aria-expanded={profileOpen}
          >
            <span className="tnav__iconCircle" style={{ position: "relative" }}>
              {profileImageUrl ? (
                <img src={profileImageUrl} alt="Profile" className="tnav__avatarImg" />
              ) : (
                <span className="tnav__initials">{initials}</span>
              )}
              <span className="tnav__dot" title="Online" />
            </span>
            <span className={`tnav__caret ${profileOpen ? "rot" : ""}`}>▾</span>
          </button>

          {profileOpen && (
            <div className="tnav__menu">
              <Link to="/student-dashboard" onClick={() => setProfileOpen(false)}>
                <span className="tnav__mi">📊</span> Dashboard
              </Link>

              <Link to="/student/profile" onClick={() => setProfileOpen(false)}>
                <span className="tnav__mi">👤</span> View Profile
              </Link>

              <div className="tnav__divider" />

              <button type="button" className="tnav__logout" onClick={logout}>
                <span className="tnav__mi">🚪</span> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default StudentNavbar;
