import React, { useState, useEffect } from "react";
import "../../styles/Reports.css";
import NavbarAfterLogin from "./NavbarAfterLogin"; // ✅ your existing teacher navbar
import TeacherSidebar from "./TeacherSidebar";

const Reports = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Mock course data
  const courses = [
    {
      id: 1,
      title: "Introduction to Programming",
      category: "Computer Science",
      students: 45,
      duration: "6 weeks",
    },
    {
      id: 2,
      title: "Business Communication",
      category: "Management",
      students: 32,
      duration: "4 weeks",
    },
    {
      id: 3,
      title: "Digital Marketing Basics",
      category: "Marketing",
      students: 60,
      duration: "8 weeks",
    },
    {
      id: 4,
      title: "Web Development with React",
      category: "Software Engineering",
      students: 52,
      duration: "10 weeks",
    },
  ];

  return (
    <div className="teacher-dashboard-layout">
      <NavbarAfterLogin onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Hamburger Button Bar - Below Navbar */}
      <div className="hamburger-bar">
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          type="button"
          aria-label="Toggle sidebar menu"
        >
          <i className={`fa-solid ${sidebarOpen ? "fa-times" : "fa-bars"}`}></i>
          <span>Menu</span>
        </button>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <div className="teacher-body">
        <TeacherSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="teacher-content">
          <div className="reports-container">
            <h2>📊 Course Enrollment Reports</h2>
            <p className="subtitle">
              Overview of student enrollment across all courses.
            </p>

            <div className="reports-grid">
              {courses.map((course) => (
                <div className="report-card" key={course.id}>
                  <h3>{course.title}</h3>
                  <p>
                    <strong>Category:</strong> {course.category}
                  </p>
                  <p>
                    <strong>Duration:</strong> {course.duration}
                  </p>
                  <div className="enrollment">
                    <i className="fa-solid fa-user-graduate"></i>
                    <span>{course.students} Enrolled Students</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Reports;
