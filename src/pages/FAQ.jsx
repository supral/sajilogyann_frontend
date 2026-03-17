import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAppLogo } from "../hooks/useAppLogo.js";
import "../styles/about.css";

const FAQ = () => {
  const navigate = useNavigate();
  const { appName } = useAppLogo();

  const faqs = [
    { q: "How do I sign up?", a: "Click Get Started or Register. Enter your details and create an account. You can then browse courses and enroll." },
    { q: "Are courses free?", a: `Many courses on ${appName} are free. Some may be part of Academy Pro+ or have a fee—check the course page for details.` },
    { q: "How do I get a certificate?", a: "Complete the course requirements (lessons, MCQs if any) as set by the instructor. Certificates are available from your dashboard once you qualify." },
    { q: "I forgot my password. What do I do?", a: "Use the Forgot password link on the login page. You will receive instructions to reset your password by email." },
    { q: "How do I contact support?", a: "Go to Contact Us or email support@sajilogyaan.com. We aim to respond within 1–2 business days." },
    { q: "What is Academy Pro+?", a: "Academy Pro+ is our premium tier with advanced courses, mentor support, and extra features. You can learn more on the Academy Pro+ page." },
  ];

  return (
    <div className="about-ui">
      <Navbar />
      <section className="about-ui-hero">
        <h1>Help / FAQ</h1>
        <p>Frequently asked questions about {appName}.</p>
      </section>
      <div className="about-ui-layout about-ui-layout--single">
        <main className="about-ui-main" style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="grid-box" style={{ marginTop: 24, textAlign: "left" }}>
            {faqs.map((item, i) => (
              <div key={i} style={{ marginBottom: 20 }}>
                <h4 style={{ marginBottom: 8 }}>{item.q}</h4>
                <p className="muted" style={{ margin: 0 }}>{item.a}</p>
              </div>
            ))}
            <button className="main-cta" onClick={() => navigate("/contact")}>Contact Us</button>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default FAQ;
