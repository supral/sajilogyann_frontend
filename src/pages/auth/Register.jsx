import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../../styles/auth.css";
import { registerApi, googleAuthApi } from "../../services/api";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    contact: "",
    address: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [passwordError, setPasswordError] = useState("");
  const [apiError, setApiError] = useState("");
  const [apiSuccess, setApiSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState("");

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

  // Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254 && !email.includes("..");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Email validation
    if (name === "email") {
      const trimmedEmail = value.trim().toLowerCase();
      if (trimmedEmail && !isValidEmail(trimmedEmail)) {
        setEmailError("Please enter a valid email address");
      } else {
        setEmailError("");
      }
    }

    // Password validation
    if (name === "password" || name === "confirmPassword") {
      const newPassword =
        name === "password" ? value : formData.password;
      const newConfirm =
        name === "confirmPassword" ? value : formData.confirmPassword;

      if (name === "password" && value.length > 0 && value.length < 6) {
        setPasswordError("Password must be at least 6 characters long");
      } else if (newPassword && newConfirm && newPassword !== newConfirm) {
        setPasswordError("Passwords do not match ❌");
      } else {
        setPasswordError("");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    setApiSuccess("");
    setEmailError("");
    setPasswordError("");

    // Validate email
    const trimmedEmail = formData.email.trim().toLowerCase();
    if (!trimmedEmail) {
      setEmailError("Email is required");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    // Validate password
    if (formData.password.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setPasswordError("Passwords do not match ❌");
      return;
    }

    setLoading(true);

    try {
      const fullName = [
        formData.firstName,
        formData.middleName,
        formData.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      const payload = {
        name: fullName,
        email: trimmedEmail,
        password: formData.password,
        phone: formData.contact,
        address: formData.address, // backend may ignore if not in schema
        // role: "student", // uncomment if you want to force role
      };

      await registerApi(payload);

      setApiSuccess(
        "Registration successful! You can now log in with your credentials."
      );

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      console.error("Registration error:", err);
      setApiError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setApiError("");
    setEmailError("");
    setPasswordError("");
    setLoading(true);

    try {
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      if (!clientId) {
        setApiError("Google Sign-In is not configured. Please use email/password.");
        setLoading(false);
        return;
      }

      if (!window.google) {
        setApiError("Google Sign-In is loading. Please try again in a moment.");
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
            setApiError("Google Sign-In popup was blocked. Please allow popups and try again.");
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
      setApiError("Failed to initialize Google Sign-In. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleCallback = async (response) => {
    setLoading(true);
    setApiError("");

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
      if (token) localStorage.setItem("bs_token", token);
      if (user) localStorage.setItem("bs_user", JSON.stringify(user));

      const role = user?.role || "student";

      setApiSuccess("Registration successful! Redirecting...");

      setTimeout(() => {
        if (role === "admin") {
          navigate("/admin-dashboard", { replace: true });
        } else if (role === "teacher") {
          navigate("/teacher-dashboard", { replace: true });
        } else {
          navigate("/student-dashboard", { replace: true });
        }
      }, 1000);
    } catch (err) {
      console.error("Google auth error:", err);
      setApiError(err.message || "Google authentication failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="auth-container-new">
      <div className="login-card-new">
        {/* LEFT PANEL - WELCOME */}
        <div className="login-welcome-panel">
          <div className="welcome-content">
            <h1 className="welcome-title">JOIN US</h1>
            <h2 className="welcome-subtitle">Sajilo Gyann</h2>
            <p className="welcome-text">
              Create your account and start your learning journey. Access courses, track your progress, and earn certificates.
            </p>
          </div>
          
          {/* Decorative Spheres */}
          <div className="sphere sphere-1"></div>
          <div className="sphere sphere-2"></div>
          <div className="sphere sphere-3"></div>
        </div>

        {/* RIGHT PANEL - REGISTRATION FORM */}
        <div className="login-form-panel">
          <div className="form-header">
            <h2>Create Account</h2>
            <p>Fill in your details to get started</p>
          </div>

          {apiError && <p className="error-message">{apiError}</p>}
          {apiSuccess && <p className="success-message">{apiSuccess}</p>}
          {emailError && <p className="error-message">{emailError}</p>}
          {passwordError && <p className="error-message">{passwordError}</p>}

          <form onSubmit={handleSubmit}>
            {/* Name Row - First and Middle Name */}
            <div className="register-name-row">
              <div className="input-group-new" style={{ flex: "1", marginRight: "0.75rem" }}>
                <i className="fa fa-user input-icon"></i>
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
              </div>

              <div className="input-group-new" style={{ flex: "1", marginLeft: "0.75rem" }}>
                <i className="fa fa-user input-icon"></i>
                <input
                  type="text"
                  name="middleName"
                  placeholder="Middle Name (Optional)"
                  value={formData.middleName}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Last Name */}
            <div className="input-group-new">
              <i className="fa fa-user input-icon"></i>
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            {/* Contact */}
            <div className="input-group-new">
              <i className="fa fa-phone input-icon"></i>
              <input
                type="tel"
                name="contact"
                placeholder="Contact Number"
                value={formData.contact}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            {/* Address */}
            <div className="input-group-new">
              <i className="fa fa-map-marker-alt input-icon"></i>
              <input
                type="text"
                name="address"
                placeholder="Address"
                value={formData.address}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            {/* Email */}
            <div className="input-group-new">
              <i className="fa fa-envelope input-icon"></i>
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                disabled={loading}
                required
                className={emailError ? "input-error" : ""}
              />
            </div>

            {/* Password */}
            <div className="input-group-new password-group">
              <i className="fa fa-lock input-icon"></i>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
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

            {/* Confirm Password */}
            <div className="input-group-new password-group">
              <i className="fa fa-lock input-icon"></i>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="show-password-btn"
                onClick={() => setShowConfirmPassword((s) => !s)}
                disabled={loading}
              >
                {showConfirmPassword ? "HIDE" : "SHOW"}
              </button>
            </div>

            {/* Create Account Button */}
            <button type="submit" className="signin-btn-primary" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="divider-new">
            <span>Or</span>
          </div>

          {/* Google Sign Up */}
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
            <span>Sign up with Google</span>
          </button>

          {/* Login Link */}
          <p className="signup-prompt">
            Already have an account?{" "}
            <Link to="/login" className="signup-link-new">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
