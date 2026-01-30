// src/pages/student/StudentSidebar.jsx
import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const items = [
  { label: "Enrolled Courses", path: "/student/enrolled-courses", icon: "fa-book-open" },
  { label: "Archived Courses", path: "/student/archived-courses", icon: "fa-box-archive" },
  { label: "Assignments", path: "/student/assignments", icon: "fa-clipboard-list" },
  { label: "Progress Tracker", path: "/student/progress-tracker", icon: "fa-chart-line" },
  { label: "Practice Quizzes", path: "/student/practice-quizzes", icon: "fa-question-circle" },
  { label: "Certificates", path: "/student/certificates", icon: "fa-certificate" },
  { label: "Notifications", path: "/student/notifications", icon: "fa-bell" },
];

export default function StudentSidebar({ activePath, isOpen = false, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const current = activePath || location.pathname;

  const handleNavigate = (path) => {
    navigate(path);
    // Close sidebar on mobile only (below 768px) when navigating
    if (onClose && window.innerWidth <= 768) {
      onClose();
    }
  };

  // Close sidebar on route change (mobile only - below 768px)
  useEffect(() => {
    if (onClose && window.innerWidth <= 768) {
      onClose();
    }
  }, [location.pathname, onClose]);

  return (
    <div className={`sd-sidebar ${isOpen ? "sidebar-open" : ""}`}>
      <div className="sd-sidebarTitle">My Learning</div>

      <div className="sd-sideList">
        {items.map((it) => {
          const isActive =
            current === it.path ||
            (current.startsWith(it.path) && it.path !== "/student-dashboard");

          return (
            <button
              key={it.path}
              type="button"
              className={`sd-sideItem ${isActive ? "active" : ""}`}
              onClick={() => handleNavigate(it.path)}
            >
              {it.icon && <i className={`fa-solid ${it.icon}`} style={{ marginRight: "8px", width: "16px" }}></i>}
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
