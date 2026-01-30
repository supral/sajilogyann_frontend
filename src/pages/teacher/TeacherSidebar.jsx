import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/TeacherDashboard.css";

const TeacherSidebar = ({ activeTab, setActiveTab, isOpen = false, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isTabMode =
    typeof activeTab === "string" && typeof setActiveTab === "function";

  const computedActiveTab = useMemo(() => {
    if (isTabMode) return activeTab;

    if (location.pathname === "/teacher-dashboard") return "dashboard";
    if (location.pathname === "/create-course") return "create-course";
    if (location.pathname === "/view-courses") return "view-courses";
    if (location.pathname === "/teacher/archived-courses") return "archived-courses";
    if (location.pathname === "/teacher/enrolled-students") return "enrolled-students";
    if (location.pathname === "/teacher/mcq-attempts") return "mcq-attempts";
    if (location.pathname === "/teacher/analytics") return "analytics";
    if (location.pathname === "/reports") return "reports";

    return "dashboard";
  }, [isTabMode, activeTab, location.pathname]);

  const go = (route) => {
    if (isTabMode && setActiveTab) {
      // Extract tab name from route
      const tabMap = {
        "/teacher-dashboard": "dashboard",
        "/create-course": "create-course",
        "/view-courses": "view-courses",
        "/teacher/archived-courses": "archived-courses",
        "/teacher/enrolled-students": "enrolled-students",
        "/teacher/mcq-attempts": "mcq-attempts",
        "/teacher/analytics": "analytics",
        "/reports": "reports",
      };
      setActiveTab(tabMap[route] || "dashboard");
    }
    // Close sidebar on mobile only (below 768px) when navigating
    if (onClose && window.innerWidth <= 768) {
      onClose();
    }
    navigate(route);
  };

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "fa-house",
      route: "/teacher-dashboard",
    },
    {
      id: "courses",
      label: "Courses",
      icon: "fa-book",
      children: [
        { id: "create-course", label: "Create Course", route: "/create-course" },
        { id: "view-courses", label: "View Courses", route: "/view-courses" },
        { id: "archived-courses", label: "Archived Courses", route: "/teacher/archived-courses" },
      ],
    },
    {
      id: "enrolled-students",
      label: "Enrolled Students",
      icon: "fa-users",
      route: "/teacher/enrolled-students",
    },
    {
      id: "mcq-attempts",
      label: "MCQ Attempts",
      icon: "fa-clipboard-list",
      route: "/teacher/mcq-attempts",
    },
    {
      id: "analytics",
      label: "Analytics & Reports",
      icon: "fa-chart-line",
      route: "/teacher/analytics",
    },
  ];

  const isCourseTab = ["create-course", "view-courses", "archived-courses"].includes(computedActiveTab);
  const [activeDropdown, setActiveDropdown] = React.useState(isCourseTab ? "courses" : null);

  React.useEffect(() => {
    if (isCourseTab) setActiveDropdown("courses");
    else setActiveDropdown(null);
  }, [isCourseTab]);

  // Close sidebar on route change (mobile only - below 768px)
  React.useEffect(() => {
    if (onClose && window.innerWidth <= 768) {
      onClose();
    }
  }, [location.pathname, onClose]);

  const toggleDropdown = (menu) => {
    setActiveDropdown((prev) => (prev === menu ? null : menu));
  };

  return (
    <aside className={`teacher-sidebar ${isOpen ? "sidebar-open" : ""}`}>
      {menuItems.map((item) => {
        if (item.children) {
          const isActive = item.children.some((child) => child.id === computedActiveTab);
          return (
            <div key={item.id} className="dropdown">
              <button
                className={isActive ? "active" : ""}
                onClick={() => toggleDropdown(item.id)}
              >
                <i className={`fa-solid ${item.icon}`}></i> {item.label}
                <span className={`chev ${activeDropdown === item.id ? "open" : ""}`}>
                  <i className="fa-solid fa-chevron-down"></i>
                </span>
              </button>

              {activeDropdown === item.id && (
                <div className="dropdown-menu">
                  <ul>
                    {item.children.map((child) => (
                      <li
                        key={child.id}
                        className={computedActiveTab === child.id ? "active" : ""}
                        onClick={() => go(child.route)}
                      >
                        {child.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        }

        return (
          <button
            key={item.id}
            className={computedActiveTab === item.id ? "active" : ""}
            onClick={() => go(item.route)}
          >
            <i className={`fa-solid ${item.icon}`}></i> {item.label}
          </button>
        );
      })}
    </aside>
  );
};

export default TeacherSidebar;
