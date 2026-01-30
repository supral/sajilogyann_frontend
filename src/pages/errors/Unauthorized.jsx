// src/pages/errors/Unauthorized.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const Unauthorized = () => {
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
      navigate("/login");
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

  const handleLogin = () => {
    // Clear any existing tokens
    localStorage.removeItem("bs_token");
    localStorage.removeItem("bs_user");
    sessionStorage.removeItem("bs_token");
    sessionStorage.removeItem("bs_user");
    navigate("/login");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f97316 0%, #dc2626 100%)",
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
        {/* 403 Icon */}
        <div
          style={{
            width: "120px",
            height: "120px",
            margin: "0 auto 30px",
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <i
            className="fa-solid fa-shield-halved"
            style={{ fontSize: "48px", color: "#d97706" }}
          ></i>
        </div>

        {/* Error Code */}
        <h1
          style={{
            fontSize: "72px",
            fontWeight: "900",
            margin: "0 0 10px",
            background: "linear-gradient(135deg, #f97316 0%, #dc2626 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          403
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
          Access Denied
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
          Sorry, you don't have permission to access this page. This area is
          restricted to authorized users only.
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
              e.currentTarget.style.borderColor = "#f97316";
              e.currentTarget.style.color = "#f97316";
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
              background: "linear-gradient(135deg, #f97316 0%, #dc2626 100%)",
              color: "white",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 15px rgba(249, 115, 22, 0.4)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 6px 20px rgba(249, 115, 22, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 15px rgba(249, 115, 22, 0.4)";
            }}
          >
            <i className="fa-solid fa-home"></i>
            Go to Dashboard
          </button>
        </div>

        {/* Login Link */}
        <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #e2e8f0" }}>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 12px" }}>
            Need to switch accounts?
          </p>
          <button
            onClick={handleLogin}
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: "600",
              border: "none",
              borderRadius: "8px",
              background: "#f1f5f9",
              color: "#475569",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e2e8f0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f1f5f9";
            }}
          >
            <i className="fa-solid fa-right-to-bracket" style={{ marginRight: "8px" }}></i>
            Login with Different Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
