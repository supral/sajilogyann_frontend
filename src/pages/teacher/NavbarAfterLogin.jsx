import React, { useMemo, useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../../styles/NavbarAfterLogin.css";
import { useAppLogo } from "../../hooks/useAppLogo.js";
import { buildProfileImageUrl } from "../../utils/profileImageUrl.js";

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

  // Fetched profile must win over a stale parent `user` prop (e.g. useMemo([]) from login snapshot).
  const user = userState || userProp || storageUser;

  const displayName = user?.name || user?.fullName || "Teacher";

  const initials = useMemo(() => {
    const n = (displayName || "").trim();
    if (!n) return "U";
    const parts = n.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "U";
    const b = parts.length > 1 ? parts[1]?.[0] : "";
    return (a + b).toUpperCase();
  }, [displayName]);

  const profileImageUrl = useMemo(
    () => buildProfileImageUrl(API_BASE, user?.profileImage),
    [user?.profileImage]
  );

  const logout = () => {
    localStorage.removeItem("bs_token");
    localStorage.removeItem("bs_user");
    sessionStorage.removeItem("bs_token");
    sessionStorage.removeItem("bs_user");
    ["bs_role", "userRole", "role"].forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
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

  // ✅ IMPORTANT: fetch latest teacher profile when teacher routes load (try v1 + legacy paths)
  useEffect(() => {
    const fetchTeacherProfile = async () => {
      if (!token) return;

      const paths = ["/api/v1/teacher/profile", "/api/teacher/profile"];

      try {
        setLoadingUser(true);

        let data = null;
        for (const p of paths) {
          try {
            const res = await fetch(`${API_BASE}${p}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401) {
              logout();
              return;
            }
            if (!res.ok) continue;
            data = await res.json();
            if (data && typeof data === "object") break;
          } catch {
            /* try next path */
          }
        }

        if (!data) return;

        if (data?.profileImage) {
          setAvatarBroken(false);
        }

        let base = {};
        try {
          const raw =
            localStorage.getItem("bs_user") ||
            sessionStorage.getItem("bs_user") ||
            "{}";
          base = JSON.parse(raw);
        } catch {
          base = {};
        }
        const merged = { ...base, ...data };

        setUserState(merged);

        if (localStorage.getItem("bs_token")) {
          localStorage.setItem("bs_user", JSON.stringify(merged));
        } else if (sessionStorage.getItem("bs_token")) {
          sessionStorage.setItem("bs_user", JSON.stringify(merged));
        }

        window.dispatchEvent(
          new CustomEvent("bs-user-updated", { detail: merged })
        );
      } catch (e) {
        console.error("Error fetching teacher profile:", e);
      } finally {
        setLoadingUser(false);
      }
    };

    if (
      token &&
      (location.pathname.startsWith("/teacher") ||
        location.pathname === "/teacher-dashboard")
    ) {
      fetchTeacherProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, location.pathname]);

  // ✅ Get app logo and name (dynamic from backend settings)
  const { logoUrl, appName } = useAppLogo();
  const logoFallbackText = useMemo(() => {
    const s = String(appName || "S").trim();
    const words = s.split(/\s+/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return s.slice(0, 2).toUpperCase() || "SG";
  }, [appName]);

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
            <div className="tnav__profileRow">
              <Link
                to="/teacher/profile"
                className="tnav__avatarLinkBtn"
                aria-label="View profile details"
                onClick={() => setOpen(false)}
              >
                <span className="tnav__iconCircle">
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

                  {loadingUser && (
                    <span className="tnav__dot" title="Loading..." />
                  )}
                </span>
              </Link>
              <button
                type="button"
                className="tnav__caretOnlyBtn"
                onClick={() => setOpen((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpen((v) => !v);
                  }
                }}
                aria-label="Open account menu"
                aria-expanded={open}
                aria-haspopup="true"
              >
                <span className={`tnav__caret ${open ? "rot" : ""}`}>▾</span>
              </button>
            </div>

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
