// src/pages/student/StudentPageLayout.jsx
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import StudentNavbar from "./StudentNavbar";
import Footer from "../../components/Footer";
import StudentSidebar from "./StudentSidebar";
import "../../styles/dashboard.css";

export default function StudentPageLayout({ title, children, activePath }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile only - below 768px)
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Ensure sidebar is always visible on desktop/tablet (above 768px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(false); // Close overlay, sidebar will be visible via CSS
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Check on mount

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <StudentNavbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <div className="sd-wrap">
        <div className="sd-grid">
          {/* Left Sidebar */}
          <StudentSidebar
            activePath={activePath}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Main Content */}
          <div className="sd-main">
            {title ? <h2 className="sd-pageTitle">{title}</h2> : null}
            <div className="sd-panel">{children}</div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
