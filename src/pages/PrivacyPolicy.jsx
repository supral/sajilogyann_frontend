import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAppLogo } from "../hooks/useAppLogo.js";
import "../styles/about.css";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const { appName, supportEmail } = useAppLogo();
  const contactEmail = supportEmail || "support@sajilogyaan.com";

  return (
    <div className="about-ui">
      <Navbar />
      <section className="about-ui-hero">
        <h1>Privacy Policy</h1>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </section>
      <div className="about-ui-layout about-ui-layout--single">
        <main className="about-ui-main" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="grid-box" style={{ textAlign: "left", marginTop: 24 }}>
            <h3>1. Information we collect</h3>
            <p>We collect information you provide when you register, enroll in courses, or contact us (e.g. name, email, profile data and learning progress).</p>
            <h3>2. How we use it</h3>
            <p>We use your information to run the platform, deliver courses, issue certificates, and improve our services. We do not sell your data to third parties.</p>
            <h3>3. Data security</h3>
            <p>We use industry-standard measures to protect your data. Passwords are hashed; access is restricted to authorized personnel.</p>
            <h3>4. Cookies and storage</h3>
            <p>We use local storage and session storage for login and preferences. You can clear these in your browser settings.</p>
            <h3>5. Your rights</h3>
            <p>You can request access, correction, or deletion of your data by contacting us at {contactEmail}.</p>
            <h3>6. Changes</h3>
            <p>We may update this policy from time to time. Continued use of {appName} after changes means you accept the updated policy.</p>
            <button className="main-cta" onClick={() => navigate("/")}>Back to Home</button>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
