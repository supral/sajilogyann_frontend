// src/pages/auth/Login.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import "../../styles/auth.css";
import loginIllustration from "../../assets/images/hero.jpg";
import { loginApi, googleAuthApi } from "../../services/api";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from = useMemo(() => {
    return location.state?.from?.pathname || null;
  }, [location.state]);

  // Load Google OAuth script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleGoogleSignIn = () => {
    setError("");
    setLoading(true);

    try {
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      if (!clientId) {
        setError("Google Sign-In is not configured. Please use email/password.");
        setLoading(false);
        return;
      }

      if (!window.google) {
        setError("Google Sign-In is loading. Please try again in a moment.");
        setLoading(false);
        return;
      }

      // Initialize Google Sign-In
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCallback,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Render a hidden button and click it to trigger popup
      const buttonDiv = document.createElement("div");
      buttonDiv.style.display = "none";
      buttonDiv.id = "google-signin-button-hidden";
      document.body.appendChild(buttonDiv);

      window.google.accounts.id.renderButton(buttonDiv, {
        type: "standard",
        theme: "outline",
        size: "large",
        click_listener: () => {},
      });

      // Click the rendered button to trigger OAuth popup
      const googleButton = buttonDiv.querySelector("div[role='button']");
      if (googleButton) {
        googleButton.click();
      } else {
        // Fallback to prompt if button not found
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setError("Google Sign-In popup was blocked. Please allow popups and try again.");
            setLoading(false);
          }
        });
      }

      // Cleanup
      setTimeout(() => {
        const el = document.getElementById("google-signin-button-hidden");
        if (el) el.remove();
      }, 1000);
    } catch (err) {
      console.error("Google Sign-In error:", err);
      setError("Failed to initialize Google Sign-In. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleCallback = async (response) => {
    setLoading(true);
    setError("");

    try {
      const data = await googleAuthApi(response.credential);

      const user =
        data?.user || data?.data?.user || data?.data?.loggedInUser || null;

      const token =
        data?.token ||
        data?.accessToken ||
        data?.data?.accessToken ||
        data?.data?.token ||
        null;

      // Clear old auth
      localStorage.removeItem("bs_token");
      localStorage.removeItem("bs_user");
      sessionStorage.removeItem("bs_token");
      sessionStorage.removeItem("bs_user");

      // Store new auth
      const storage = rememberMe ? localStorage : sessionStorage;
      if (token) storage.setItem("bs_token", token);
      if (user) storage.setItem("bs_user", JSON.stringify(user));

      const role = user?.role || "student";

      if (from) {
        navigate(from, { replace: true });
        return;
      }

      if (role === "admin") {
        navigate("/admin-dashboard", { replace: true });
      } else if (role === "teacher") {
        navigate("/teacher-dashboard", { replace: true });
      } else {
        navigate("/student-dashboard", { replace: true });
      }
    } catch (err) {
      console.error("Google auth error:", err);
      setError(getNiceError(err));
    } finally {
      setLoading(false);
    }
  };

  // Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254 && !email.includes("..");
  };

  const getNiceError = (err) => {
    return (
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Login failed. Please try again."
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setError("Please enter your email.");
    if (!isValidEmail(cleanEmail)) return setError("Please enter a valid email address.");
    if (!password) return setError("Please enter your password.");

    setLoading(true);

    try {
      const data = await loginApi({ email: cleanEmail, password });

      const user =
        data?.user || data?.data?.user || data?.data?.loggedInUser || null;

      const token =
        data?.token ||
        data?.accessToken ||
        data?.data?.accessToken ||
        data?.data?.token ||
        null;

      // IMPORTANT: always clear old auth from BOTH storages first
      localStorage.removeItem("bs_token");
      localStorage.removeItem("bs_user");
      sessionStorage.removeItem("bs_token");
      sessionStorage.removeItem("bs_user");

      // Remember me: localStorage (persistent) vs sessionStorage (tab session)
      const storage = rememberMe ? localStorage : sessionStorage;

      if (token) storage.setItem("bs_token", token);
      if (user) storage.setItem("bs_user", JSON.stringify(user));

      const role = user?.role || "student";

      // If protected route sent user here, go back to that path
      if (from) {
        navigate(from, { replace: true });
        return;
      }

      // Role-based redirect
      if (role === "admin") {
        navigate("/admin-dashboard", { replace: true });
      } else if (role === "teacher") {
        navigate("/teacher-dashboard", { replace: true });
      } else {
        navigate("/student-dashboard", { replace: true });
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(getNiceError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container-new">
      <div className="login-card-new">
        {/* LEFT PANEL - WELCOME */}
        <div className="login-welcome-panel">
          <div className="welcome-content">
            <h1 className="welcome-title">WELCOME</h1>
            <h2 className="welcome-subtitle">Sajilo Gyann</h2>
            <p className="welcome-text">
              Sign in to access your dashboard, courses, learning tools, and university resources.
            </p>
          </div>
          
          {/* Decorative Spheres */}
          <div className="sphere sphere-1"></div>
          <div className="sphere sphere-2"></div>
          <div className="sphere sphere-3"></div>
        </div>

        {/* RIGHT PANEL - SIGN IN FORM */}
        <div className="login-form-panel">
          <div className="form-header">
            <h2>Sign in</h2>
            <p>Enter your credentials to access your account</p>
          </div>

          {error && <p className="error-message">{error}</p>}

          <form onSubmit={handleSubmit}>
            {/* Email/Username */}
            <div className="input-group-new">
              <i className="fa fa-user input-icon"></i>
              <input
                type="email"
                placeholder="User Name"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>

            {/* Password */}
            <div className="input-group-new password-group">
              <i className="fa fa-lock input-icon"></i>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="show-password-btn"
                onClick={() => setShowPassword((s) => !s)}
                disabled={loading}
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="forgot-link">
                Forgot Password?
              </Link>
            </div>

            {/* Sign In Button */}
            <button type="submit" className="signin-btn-primary" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div className="divider-new">
            <span>Or</span>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            className="signin-btn-secondary google-signin-btn"
            disabled={loading}
            onClick={handleGoogleSignIn}
          >
            <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Sign in with Google</span>
          </button>

          {/* Sign Up Link */}
          <p className="signup-prompt">
            Don't have an account?{" "}
            <Link to="/register" className="signup-link-new">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
