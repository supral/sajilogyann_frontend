import React, { useMemo, useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../../styles/NavbarAfterLogin.css";
import { useAppLogo } from "../../hooks/useAppLogo.js";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const NavbarAfterLogin = ({ user: userProp, onMenuToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const token =
    localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

  const [userState, setUserState] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);

  const storageUser = useMemo(() => {
    try {
      const raw =
        localStorage.getItem("bs_user") || sessionStorage.getItem("bs_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // Priority: prop > fetched > storage
  const user = userProp || userState || storageUser;

  const displayName = user?.name || user?.fullName || "Teacher";

  const initials = useMemo(() => {
    const n = (displayName || "").trim();
    if (!n) return "U";
    const parts = n.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "U";
    const b = parts.length > 1 ? parts[1]?.[0] : "";
    return (a + b).toUpperCase();
  }, [displayName]);

  const profileImageUrl = useMemo(() => {
    const p = user?.profileImage || "";
    if (!p) return "";
    if (p.startsWith("http://") || p.startsWith("https://")) return p;
    return `${API_BASE}${p}`; // "/uploads/profile/xxx.jpg"
  }, [user?.profileImage]);

  const logout = () => {
    localStorage.removeItem("bs_token");
    localStorage.removeItem("bs_user");
    sessionStorage.removeItem("bs_token");
    sessionStorage.removeItem("bs_user");
    setOpen(false);
    setUserState(null);
    navigate("/", { replace: true });
  };

  // ✅ close dropdown on outside click and ESC key
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  // ✅ close dropdown on route change
  useEffect(() => setOpen(false), [location.pathname]);

  // ✅ IMPORTANT: fetch latest teacher profile every time dashboard loads (and when route changes)
  useEffect(() => {
    const fetchTeacherProfile = async () => {
      if (!token) return;

      try {
        setLoadingUser(true);

        const res = await fetch(`${API_BASE}/api/teacher/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          if (res.status === 401) {
            logout();
            return;
          }
          // Don't update user state on other errors
          return;
        }

        const data = await res.json();

        // reset avatar error if we got a new image
        if (data?.profileImage) {
          setAvatarBroken(false);
        }

        // save to state
        setUserState((prev) => ({
          ...(storageUser || {}),
          ...(prev || {}),
          ...(data || {}),
        }));

        // ✅ also sync storage so it works after refresh
        const merged = { ...(storageUser || {}), ...(data || {}) };

        if (localStorage.getItem("bs_token")) {
          localStorage.setItem("bs_user", JSON.stringify(merged));
        } else if (sessionStorage.getItem("bs_token")) {
          sessionStorage.setItem("bs_user", JSON.stringify(merged));
        }
      } catch (e) {
        console.error("Error fetching teacher profile:", e);
        // ignore network errors but don't crash
      } finally {
        setLoadingUser(false);
      }
    };

    // Only fetch if we have a token and we're on a teacher route
    if (token && (location.pathname.startsWith("/teacher") || location.pathname === "/teacher-dashboard")) {
      fetchTeacherProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, location.pathname]);

  // ✅ Get app logo
  const { logoUrl } = useAppLogo();

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
        <Link to="/teacher-dashboard" className="tnav__brand">
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
        </Link>
      </div>

      {/* MIDDLE */}
      <div className="tnav__center">
        {token ? (
          <>
            <span className="tnav__welcomeStrong">Welcome</span>{" "}
            <span className="tnav__welcomeText">
              to the Teacher Dashboard,
              <span className="tnav__userName"> {displayName}</span>
            </span>
          </>
        ) : (
          <span className="tnav__welcomeText">Welcome to Sajilo Gyann</span>
        )}
      </div>

      {/* RIGHT */}
      <div className="tnav__right">
        {!token ? (
          <div className="tnav__auth">
            <Link to="/login" className="tnav__btn tnav__btn--ghost">
              Login
            </Link>
            <Link to="/register" className="tnav__btn tnav__btn--primary">
              Register
            </Link>
          </div>
        ) : (
          <div className="tnav__profile" ref={menuRef}>
            <button
              type="button"
              className="tnav__iconBtn"
              onClick={() => setOpen((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpen((v) => !v);
                }
              }}
              aria-label="Open profile menu"
              aria-expanded={open}
              aria-haspopup="true"
            >
              <span className="tnav__iconCircle">
                {/* ✅ Show image if exists + not broken, else initials */}
                {profileImageUrl && !avatarBroken ? (
                  <img
                    src={profileImageUrl}
                    alt="Profile"
                    className="tnav__avatarImg"
                    onError={() => setAvatarBroken(true)}
                  />
                ) : (
                  <span className="tnav__initials">{initials}</span>
                )}

                {loadingUser && <span className="tnav__dot" title="Loading..." />}
              </span>

              <span className={`tnav__caret ${open ? "rot" : ""}`}>▾</span>
            </button>

            {open && (
              <div className="tnav__menu" role="menu" aria-label="User menu">
                <Link
                  to="/teacher/profile"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="tnav__menuItem"
                >
                  <i className="fa-solid fa-user tnav__mi"></i> View Profile
                </Link>

                <Link
                  to="/change-password"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="tnav__menuItem"
                >
                  <i className="fa-solid fa-lock tnav__mi"></i> Change Password
                </Link>

                <div className="tnav__divider" />

                <button
                  type="button"
                  className="tnav__logout tnav__menuItem"
                  onClick={logout}
                  role="menuitem"
                >
                  <i className="fa-solid fa-right-from-bracket tnav__mi"></i> Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default NavbarAfterLogin;
