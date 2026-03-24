import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavbarAfterLogin from "./NavbarAfterLogin";
import TeacherSidebar from "./TeacherSidebar";
import ActivityLogPanel from "../../components/ActivityLogPanel";
import "../../styles/TeacherDashboard.css";

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

const getStoredUser = () => {
  try {
    const raw =
      localStorage.getItem("bs_user") || sessionStorage.getItem("bs_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function TeacherActivityLog() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("activity-log");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardUser, setDashboardUser] = useState(() => getStoredUser());

  useEffect(() => {
    const onUser = (e) => {
      const d = e?.detail;
      if (d && typeof d === "object" && d.role === "teacher") {
        setDashboardUser(d);
      }
    };
    window.addEventListener("bs-user-updated", onUser);
    return () => window.removeEventListener("bs-user-updated", onUser);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    const role = dashboardUser?.role || getStoredUser()?.role || "student";
    if (role !== "teacher") {
      if (role === "admin") navigate("/admin-dashboard", { replace: true });
      else navigate("/student-dashboard", { replace: true });
    }
  }, [navigate, dashboardUser?.role]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="teacher-dashboard-layout">
      <NavbarAfterLogin
        user={dashboardUser}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="hamburger-bar">
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          type="button"
          aria-label="Toggle sidebar menu"
        >
          <i className={`fa-solid ${sidebarOpen ? "fa-times" : "fa-bars"}`} />
          <span>Menu</span>
        </button>
      </div>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <div className="teacher-body">
        <TeacherSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="teacher-content">
          <h1 style={{ margin: "0 0 8px", fontSize: "1.5rem", color: "#0f172a" }}>Activity log</h1>
          <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 14, lineHeight: 1.5, maxWidth: 720 }}>
            Your account events plus teaching activity: recent enrollments on your courses, student MCQ attempts
            (pass/fail), and other learning signals. Summary cards use the last 14 days for enrollments and MCQ
            outcomes.
          </p>
          <ActivityLogPanel />
        </main>
      </div>
    </div>
  );
}
