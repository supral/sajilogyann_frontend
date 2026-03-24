import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../../styles/NavbarAfterLogin.css";
import { useAppLogo } from "../../hooks/useAppLogo.js";
import { buildProfileImageUrl } from "../../utils/profileImageUrl.js";

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

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const [browseOpen, setBrowseOpen] = useState(false);
  const browseRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);

  const token =
    localStorage.getItem("bs_token") ||
    sessionStorage.getItem("bs_token");

  const storageUser = useMemo(() => {
    if (userProp) return userProp;
    try {
      const raw =
        localStorage.getItem("bs_user") ||
        sessionStorage.getItem("bs_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [userProp]);

  const [updatedUser, setUpdatedUser] = useState(null);
  const [fetchedProfileUser, setFetchedProfileUser] = useState(null);
  const [avatarBroken, setAvatarBroken] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail && typeof e.detail === "object") setUpdatedUser(e.detail);
    };
    window.addEventListener("bs-user-updated", handler);
    return () => window.removeEventListener("bs-user-updated", handler);
  }, []);

  const user = updatedUser || fetchedProfileUser || storageUser;

  const displayName = user?.name || user?.fullName || "Student";

  const profileImageUrl = useMemo(
    () => buildProfileImageUrl(API_HOST, user?.profileImage),
    [user?.profileImage]
  );

  useEffect(() => {
    setAvatarBroken(false);
  }, [user?.profileImage]);

  const initials = useMemo(() => {
    const parts = String(displayName || "S").trim().split(" ");
    const a = parts[0]?.[0] || "S";
    const b = parts.length > 1 ? parts[1]?.[0] : "";
    return (a + b).toUpperCase();
  }, [displayName]);

  // ✅ Get app logo and name (dynamic from backend settings)
  const { logoUrl, appName } = useAppLogo();
  const logoFallbackText = useMemo(() => {
    const s = String(appName || "S").trim();
    const words = s.split(/\s+/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return s.slice(0, 2).toUpperCase() || "SG";
  }, [appName]);

  const logout = () => {
    localStorage.removeItem("bs_token");
    localStorage.removeItem("bs_user");
    sessionStorage.removeItem("bs_token");
    sessionStorage.removeItem("bs_user");
    ["bs_role", "userRole", "role"].forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    setProfileOpen(false);
    setBrowseOpen(false);
    navigate("/", { replace: true });
  };

  /** Load latest profile (incl. profileImage) — GET returns nested `profile`, unlike flat `bs_user` from login. */
  useEffect(() => {
    if (!token) {
      setFetchedProfileUser(null);
      return;
    }

    const role = storageUser?.role;
    if (role && role !== "student") {
      setFetchedProfileUser(null);
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
            logout();
            return;
          }
          if (!res.ok) continue;
          const data = await safeJson(res);
          const profile = data?.profile;
          if (!profile || typeof profile !== "object" || cancelled) return;
          if (profile.profileImage) setAvatarBroken(false);
          const merged = mergeStorageWithProfile(profile);
          setFetchedProfileUser(merged);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: refetch when token / role changes only
  }, [token, storageUser?.role]);

  // close menus on route change
  useEffect(() => {
    setProfileOpen(false);
    setNotificationsOpen(false);
    setBrowseOpen(false);
  }, [location.pathname]);

  // Fetch notifications on mount so bell badge shows unread count
  useEffect(() => {
    if (token) fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when token is set, not when fetchNotifications identity changes
  }, [token]);

  // close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false);
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

  const fetchNotifications = async () => {
    if (!token) return;
    setNotifLoading(true);
    try {
      for (const prefix of API_PREFIXES) {
        const res = await fetch(`${API_HOST}${prefix}/notifications`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (res.ok) {
          const data = await safeJson(res);
          const list = Array.isArray(data) ? data : (data?.notifications ?? []);
          setNotifications(list);
          break;
        }
      }
    } catch (e) {
      console.error("Fetch notifications error:", e);
    } finally {
      setNotifLoading(false);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      for (const prefix of API_PREFIXES) {
        const res = await fetch(`${API_HOST}${prefix}/notifications/read-all`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (res.ok) {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
          break;
        }
      }
    } catch (e) {
      console.error("Mark all read error:", e);
    }
  };

  const markOneAsRead = async (id) => {
    if (!token || !id) return;
    try {
      for (const prefix of API_PREFIXES) {
        const res = await fetch(`${API_HOST}${prefix}/notifications/${id}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (res.ok) {
          setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
          break;
        }
      }
    } catch (e) {
      console.error("Mark notification read error:", e);
    }
  };

  const getNotificationRoute = (n) => {
    if (!n) return "/student-dashboard";
    const type = (n.type || "").toLowerCase();
    const relatedType = (n.relatedType || "").toLowerCase();
    const relatedId = n.relatedId ? String(n.relatedId) : null;
    if (type === "certificate") return "/student/certificates";
    if (type === "enrollment" && relatedId) return `/student/course/${relatedId}`;
    if (type === "enrollment") return "/student/enrolled-courses";
    if (type === "lesson" && relatedType === "course" && relatedId) return `/student/course/${relatedId}`;
    if (type === "lesson") return "/student/enrolled-courses";
    if (type === "assignment") return "/student/assignments";
    if (type === "quiz") return "/student/practice-quizzes";
    return "/student-dashboard";
  };

  const onNotificationClick = (n) => {
    if (!n?._id) return;
    if (!n.read) markOneAsRead(n._id);
    setNotificationsOpen(false);
    navigate(getNotificationRoute(n));
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
                width: "80px",
                height: "80px",
                objectFit: "contain",
                borderRadius: "10px",
              }}
              onError={(e) => {
                e.target.style.display = "none";
                if (!e.target.nextSibling) {
                  const textLogo = document.createElement("span");
                  textLogo.className = "tnav__logo";
                  textLogo.textContent = logoFallbackText;
                  e.target.parentNode.insertBefore(textLogo, e.target);
                }
              }}
            />
          ) : (
            <span className="tnav__logo">{logoFallbackText}</span>
          )}
        </div>

        {/* Browse */}
        <div ref={browseRef} className="tnav__browseWrap">
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

        <div className="tnav__notifWrap" ref={notificationsRef}>
          <button
            type="button"
            className="tnav__iconBtn tnav__iconBtn--bell"
            onClick={() => {
              setNotificationsOpen((v) => !v);
              if (!notificationsOpen) fetchNotifications();
            }}
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            <i className="fa-solid fa-bell" />
            {notifications.some((n) => !n.read) ? (
              <span className="tnav__notifBadge" aria-hidden="true">
                {notifications.filter((n) => !n.read).length > 99 ? "99+" : notifications.filter((n) => !n.read).length}
              </span>
            ) : null}
          </button>
          {notificationsOpen && (
            <div className="tnav__notifDropdown">
              <div className="tnav__notifHeader">
                <h4>Notifications</h4>
                {notifications.some((n) => !n.read) ? (
                  <button type="button" className="tnav__notifMarkAll" onClick={markAllAsRead}>
                    Mark all as read
                  </button>
                ) : null}
              </div>
              <div className="tnav__notifList">
                {notifLoading ? (
                  <p className="tnav__notifEmpty">Loading…</p>
                ) : notifications.length === 0 ? (
                  <p className="tnav__notifEmpty">No notifications yet.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      role="button"
                      tabIndex={0}
                      className={`tnav__notifItem ${n.read ? "" : "tnav__notifItem--unread"}`}
                      onClick={() => onNotificationClick(n)}
                      onKeyDown={(e) => e.key === "Enter" && onNotificationClick(n)}
                    >
                      <p className="tnav__notifMessage">{n.message}</p>
                      <span className="tnav__notifTime">
                        {n.createdAt
                          ? (() => {
                              const d = new Date(n.createdAt);
                              const now = new Date();
                              const diffMins = Math.floor((now - d) / 60000);
                              const diffHours = Math.floor((now - d) / 3600000);
                              const diffDays = Math.floor((now - d) / 86400000);
                              if (diffMins < 1) return "Just now";
                              if (diffMins < 60) return `${diffMins}m ago`;
                              if (diffHours < 24) return `${diffHours}h ago`;
                              if (diffDays < 7) return `${diffDays}d ago`;
                              return d.toLocaleDateString();
                            })()
                          : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="tnav__profile" ref={profileRef}>
          <div className="tnav__profileRow">
            <Link
              to="/student/profile"
              className="tnav__avatarLinkBtn"
              aria-label="View profile details"
              onClick={() => setProfileOpen(false)}
            >
              <span className="tnav__iconCircle" style={{ position: "relative" }}>
                {profileImageUrl && !avatarBroken ? (
                  <img
                    src={profileImageUrl}
                    alt=""
                    className="tnav__avatarImg"
                    onError={() => setAvatarBroken(true)}
                  />
                ) : (
                  <span className="tnav__initials">{initials}</span>
                )}
                <span className="tnav__dot" title="Online" />
              </span>
            </Link>
            <button
              type="button"
              className="tnav__caretOnlyBtn"
              onClick={() => setProfileOpen((v) => !v)}
              aria-label="Open account menu"
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              <span className={`tnav__caret ${profileOpen ? "rot" : ""}`}>▾</span>
            </button>
          </div>

          {profileOpen && (
            <div className="tnav__menu">
              <Link to="/student-dashboard" onClick={() => setProfileOpen(false)}>
                <span className="tnav__mi">📊</span> Dashboard
              </Link>

              <Link to="/student/profile" onClick={() => setProfileOpen(false)}>
                <span className="tnav__mi">👤</span> View Profile
              </Link>

              <Link to="/change-password" onClick={() => setProfileOpen(false)}>
                <i className="fa-solid fa-lock tnav__mi" /> Change Password
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
