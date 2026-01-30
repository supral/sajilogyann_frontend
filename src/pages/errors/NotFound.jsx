// src/pages/errors/NotFound.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  const token =
    localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

  const getUserRole = () => {
    try {
      const raw =
        localStorage.getItem("bs_user") || sessionStorage.getItem("bs_user");
      const user = raw ? JSON.parse(raw) : null;
      return (user?.role || "").toLowerCase();
    } catch {
      return "";
    }
  };

  const handleGoHome = () => {
    if (!token) {
      navigate("/");
      return;
    }

    const role = getUserRole();
    if (role === "admin") {
      navigate("/admin-dashboard");
    } else if (role === "teacher") {
      navigate("/teacher-dashboard");
    } else {
      navigate("/student-dashboard");
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      handleGoHome();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "24px",
          padding: "60px 40px",
          textAlign: "center",
          maxWidth: "500px",
          width: "100%",
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* 404 Icon */}
        <div
          style={{
            width: "120px",
            height: "120px",
            margin: "0 auto 30px",
            background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <i
            className="fa-solid fa-map-location-dot"
            style={{ fontSize: "48px", color: "#dc2626" }}
          ></i>
        </div>

        {/* Error Code */}
        <h1
          style={{
            fontSize: "72px",
            fontWeight: "900",
            margin: "0 0 10px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          404
        </h1>

        {/* Title */}
        <h2
          style={{
            fontSize: "24px",
            fontWeight: "700",
            color: "#1e293b",
            margin: "0 0 15px",
          }}
        >
          Page Not Found
        </h2>

        {/* Description */}
        <p
          style={{
            fontSize: "16px",
            color: "#64748b",
            margin: "0 0 30px",
            lineHeight: "1.6",
          }}
        >
          Oops! The page you're looking for doesn't exist or has been moved.
          Please check the URL or navigate back to safety.
        </p>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handleGoBack}
            style={{
              padding: "14px 28px",
              fontSize: "15px",
              fontWeight: "600",
              border: "2px solid #e2e8f0",
              borderRadius: "12px",
              background: "white",
              color: "#475569",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#667eea";
              e.currentTarget.style.color = "#667eea";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e2e8f0";
              e.currentTarget.style.color = "#475569";
            }}
          >
            <i className="fa-solid fa-arrow-left"></i>
            Go Back
          </button>

          <button
            onClick={handleGoHome}
            style={{
              padding: "14px 28px",
              fontSize: "15px",
              fontWeight: "600",
              border: "none",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 6px 20px rgba(102, 126, 234, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 15px rgba(102, 126, 234, 0.4)";
            }}
          >
            <i className="fa-solid fa-home"></i>
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
