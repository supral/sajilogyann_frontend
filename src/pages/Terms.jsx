import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAppLogo } from "../hooks/useAppLogo.js";
import "../styles/about.css";

const Terms = () => {
  const navigate = useNavigate();
  const { appName } = useAppLogo();

  return (
    <div className="about-ui">
      <Navbar />
      <section className="about-ui-hero">
        <h1>Terms of Service</h1>
        <p>Please read these terms before using {appName}.</p>
      </section>
      <div className="about-ui-layout about-ui-layout--single">
        <main className="about-ui-main" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="grid-box" style={{ textAlign: "left", marginTop: 24 }}>
            <h3>1. Acceptance</h3>
            <p>By using {appName} you agree to these terms. If you do not agree, please do not use the platform.</p>
            <h3>2. Use of the platform</h3>
            <p>You must use the platform lawfully and not misuse content, accounts, or systems. You are responsible for keeping your login details secure.</p>
            <h3>3. Content and courses</h3>
            <p>Course content is provided by teachers. We do not guarantee specific outcomes. Certificates reflect completion of course requirements as defined by the platform and instructors.</p>
            <h3>4. Accounts</h3>
            <p>You must provide accurate information when registering. We may suspend or terminate accounts that violate these terms or for operational reasons.</p>
            <h3>5. Intellectual property</h3>
            <p>Content on the platform is owned by {appName} or the respective teachers. You may not copy or redistribute course materials without permission.</p>
            <h3>6. Limitation of liability</h3>
            <p>To the extent permitted by law, {appName} is not liable for indirect or consequential damages arising from your use of the platform.</p>
            <h3>7. Changes</h3>
            <p>We may update these terms. Continued use after changes constitutes acceptance.</p>
            <button className="main-cta" onClick={() => navigate("/")}>Back to Home</button>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Terms;
