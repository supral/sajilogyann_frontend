import React from "react";

export default function Maintenance() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "#f5f8ff",
      padding: 20
    }}>
      <div style={{
        width: "min(720px, 100%)",
        background: "#fff",
        borderRadius: 14,
        padding: 28,
        boxShadow: "0 12px 30px rgba(0,0,0,0.08)"
      }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>🛠️ We’re Under Maintenance</h1>
        <p style={{ marginTop: 10, opacity: 0.8, lineHeight: 1.6 }}>
          Sajilo Gyann is currently performing system maintenance.
          Please try again later.
        </p>

        <div style={{
          marginTop: 18,
          padding: 14,
          borderRadius: 12,
          background: "#f1f5ff",
          border: "1px solid #dbe5ff"
        }}>
          <b>Tip:</b> If you are an admin, open Admin Dashboard.
        </div>
      </div>
    </div>
  );
}
