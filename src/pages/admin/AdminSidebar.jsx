import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../styles/admin.css";

/**
 * Admin Sidebar Component
 * Props:
 * - activeSection (string)
 * - setActiveSection (function)
 * - sidebarOpen (boolean)
 * - setSidebarOpen (function)
 */
const AdminSidebar = ({
  activeSection,
  setActiveSection,
  sidebarOpen,
  setSidebarOpen,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Map route -> section id (so highlight works after navigation)
  const routeToSection = useMemo(
    () => [
      { path: "/admin-dashboard", id: "dashboard" },
      { path: "/admin/users", id: "user" },
      { path: "/admin/teachers", id: "teacher" },
      { path: "/admin/courses", id: "course" },
      { path: "/admin/archived-courses", id: "archived" },
      { path: "/admin/quizzes", id: "quiz" },
      { path: "/admin/casestudies", id: "case" },
      { path: "/admin/analytics", id: "analytics" },
      { path: "/admin/settings", id: "settings" }, // ✅ settings route
    ],
    []
  );

  // Auto-highlight based on URL (if user refreshed or navigated)
  React.useEffect(() => {
    const match = routeToSection.find((r) =>
      location.pathname.startsWith(r.path)
    );
    if (match && match.id !== activeSection) {
      setActiveSection(match.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ✅ Sidebar menu items (NO duplicates)
  const sections = [
    { id: "dashboard", name: "Dashboard", icon: "📊", route: "/admin-dashboard" },
    { id: "user", name: "User Management", icon: "👩‍🎓", route: "/admin/users" },
    { id: "teacher", name: "Teacher Management", icon: "👨‍🏫", route: "/admin/teachers" },
    { id: "course", name: "Course Management", icon: "📚", route: "/admin/courses" },
    { id: "archived", name: "Archived Courses", icon: "📦", route: "/admin/archived-courses" },
    { id: "quiz", name: "Quiz Management", icon: "🧩", route: "/admin/quizzes" },
    { id: "case", name: "Case Studies", icon: "🧠", route: "/admin/casestudies" },
    { id: "analytics", name: "Analytics & Reports", icon: "📈", route: "/admin/analytics" },
    { id: "settings", name: "Settings", icon: "⚙️", route: "/admin/settings" }, // ✅ only once
  ];

  const handleMenuClick = (sec) => {
    setActiveSection(sec.id);

    if (sec.route) {
      navigate(sec.route);
    }
  };

  return (
    <aside className={`admin-sidebar ${sidebarOpen ? "show" : "hide"}`}>
      <div className="sidebar-header">
        <button
          className="menu-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          type="button"
        >
          ☰
        </button>
        <h3>Admin Menu</h3>
      </div>

      <ul className="sidebar-menu">
        {sections.map((sec) => (
          <li
            key={sec.id}
            className={`menu-item ${activeSection === sec.id ? "active" : ""}`}
            onClick={() => handleMenuClick(sec)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleMenuClick(sec)}
          >
            <span className="icon">{sec.icon}</span> {sec.name}
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default AdminSidebar;
