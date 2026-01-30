import React, { useEffect, useState } from "react";
import StudentPageLayout from "./StudentPageLayout";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_PREFIXES = ["/api/v1", "/api"];

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

const getNotificationIcon = (type) => {
  switch (type) {
    case "enrollment":
      return "fa-book-open";
    case "lesson":
      return "fa-check-circle";
    case "certificate":
      return "fa-certificate";
    case "assignment":
      return "fa-clipboard-list";
    case "quiz":
      return "fa-question-circle";
    default:
      return "fa-bell";
  }
};

const getNotificationColor = (type) => {
  switch (type) {
    case "enrollment":
      return "#3b82f6"; // blue
    case "lesson":
      return "#22c55e"; // green
    case "certificate":
      return "#f59e0b"; // amber
    case "assignment":
      return "#8b5cf6"; // purple
    case "quiz":
      return "#06b6d4"; // cyan
    default:
      return "#6b7280"; // gray
  }
};

export default function Notifications() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      const token = getToken();
      for (const p of API_PREFIXES) {
        const res = await fetch(`${API_HOST}${p}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setList(Array.isArray(data) ? data : []);
          break;
        }
      }
      setLoading(false);
    };
    fetchNotifications();
  }, []);

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    return d.toLocaleDateString();
  };

  return (
    <StudentPageLayout title="Notifications" activePath="/student/notifications">
      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <p>Loading notifications...</p>
        </div>
      ) : list.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {list.map((n) => {
            const icon = getNotificationIcon(n.type);
            const color = getNotificationColor(n.type);
            const isUnread = !n.read;

            return (
              <div
                key={n._id}
                style={{
                  backgroundColor: isUnread ? "#f0f9ff" : "#fff",
                  border: `1px solid ${isUnread ? color : "#e5e7eb"}`,
                  borderLeft: `4px solid ${color}`,
                  borderRadius: "8px",
                  padding: "1rem 1.5rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: `${color}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <i
                    className={`fa-solid ${icon}`}
                    style={{ color, fontSize: "1.2rem" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: "0 0 0.5rem 0",
                      color: "#1f2937",
                      fontWeight: isUnread ? "600" : "400",
                      fontSize: "0.95rem",
                      lineHeight: "1.5",
                    }}
                  >
                    {n.message}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      alignItems: "center",
                      fontSize: "0.75rem",
                      color: "#6b7280",
                    }}
                  >
                    <span>{formatDate(n.createdAt)}</span>
                    {n.type && (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "12px",
                          backgroundColor: `${color}20`,
                          color: color,
                          fontWeight: "600",
                          textTransform: "capitalize",
                        }}
                      >
                        {n.type}
                      </span>
                    )}
                    {isUnread && (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "12px",
                          backgroundColor: "#3b82f6",
                          color: "white",
                          fontWeight: "600",
                          fontSize: "0.7rem",
                        }}
                      >
                        NEW
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StudentPageLayout>
  );
}
