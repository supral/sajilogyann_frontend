// src/pages/student/StudentSidebar.jsx
import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const items = [
  { label: "Activity log", path: "/student/activity-log", icon: "fa-clock-rotate-left" },
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

  const path = activePath || location.pathname;

  const handleNavigate = (to) => {
    navigate(to);
    if (onClose && window.innerWidth <= 768) {
      onClose();
    }
  };

  useEffect(() => {
    if (onClose && window.innerWidth <= 768) {
      onClose();
    }
  }, [location.pathname, onClose]);

  const dashboardActive = path === "/student-dashboard";

  return (
    <aside className={`sd-sidebar ${isOpen ? "sidebar-open" : ""}`}>
      <button
        type="button"
        className={`sd-sideBtn${dashboardActive ? " active" : ""}`}
        onClick={() => handleNavigate("/student-dashboard")}
      >
        <i className="fa-solid fa-chart-line" /> My Learning
      </button>

      <ul className="sd-sideList">
        {items.map((it) => {
          const isActive = path === it.path || path.startsWith(`${it.path}/`);

          return (
            <li
              key={it.path}
              className={isActive ? "active" : ""}
              onClick={() => handleNavigate(it.path)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleNavigate(it.path);
                }
              }}
            >
              <i className={`fa-solid ${it.icon}`} />
              {it.label}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
