import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import AdminSidebar from "./AdminSidebar";
import ActivityLogPanel from "../../components/ActivityLogPanel";
import "../../styles/admin.css";

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

export default function AdminActivityLog() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("activity");

  useEffect(() => {
    if (!getToken()) navigate("/login", { replace: true });
  }, [navigate]);

  return (
    <div className={`admin-layout ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <Navbar />

      <div className="admin-container">
        <AdminSidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <main className="admin-main">
          <h2 className="page-title" style={{ marginBottom: 8 }}>
            Activity log
          </h2>
          <p style={{ margin: "0 0 22px", color: "#64748b", fontSize: 14, lineHeight: 1.5, maxWidth: 800 }}>
            Recent platform events from sign-ins, password changes, profile updates, MCQ submissions, and
            certificate issuance. Extend backend logging to capture more admin-only actions when needed.
          </p>
          <ActivityLogPanel />
        </main>
      </div>
    </div>
  );
}
