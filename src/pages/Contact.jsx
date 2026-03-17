import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAppLogo } from "../hooks/useAppLogo.js";
import "../styles/about.css";

const Contact = () => {
  const navigate = useNavigate();
  const { appName, supportEmail } = useAppLogo();
  const support = supportEmail || "support@sajilogyaan.com";

  return (
    <div className="about-ui">
      <Navbar />
      <section className="about-ui-hero">
        <h1>Contact Us</h1>
        <p>Get in touch for support, partnerships, or feedback.</p>
      </section>
      <div className="about-ui-layout about-ui-layout--single">
        <main className="about-ui-main" style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="about-ui-banner">
            <div>
              <h3>Reach out to {appName}</h3>
              <p>We're here to help with courses, enrollment, or platform questions.</p>
            </div>
          </div>
          <div className="grid-box" style={{ marginTop: 24 }}>
            <h3>Contact details</h3>
            <div className="contact-row">
              <span className="label">Support</span>
              <span className="value">{support}</span>
            </div>
            <div className="contact-row">
              <span className="label">Partnership / Courses</span>
              <span className="value">{support}</span>
            </div>
            <div className="contact-row">
              <span className="label">Location</span>
              <span className="value">Nepal</span>
            </div>
            <button className="main-cta" onClick={() => navigate("/")}>Back to Home</button>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Contact;
