import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/AcademyPro.css";

const Academy = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

  return (
    <>
      <Navbar />
      <main className="pro-page">
        <section className="pro-hero">
          <div className="pro-badge-top">
            <i className="fa-solid fa-crown"></i> Academy Pro+
          </div>
          <h1>Go Beyond Learning. Get Job-Ready.</h1>
          <p className="pro-subtitle">
            Build skills in AI, Data Science, Web Development and more with advanced, mentor-led courses.
          </p>
          <p className="pro-pricing-text">
            Subscribe for <span className="pro-strike">$30/month</span>{" "}
            <span className="pro-price">$15/month</span>
          </p>
          {token ? (
            <button className="pro-cta-btn" onClick={() => navigate("/academy-pro")}>
              Go to Academy Pro+
            </button>
          ) : (
            <button className="pro-cta-btn" onClick={() => navigate("/login", { state: { from: { pathname: "/academy-pro" } } })}>
              Sign in to Get Started
            </button>
          )}
          <p className="pro-note">No credit card required during trial.</p>
        </section>
        <section style={{ padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ marginBottom: 16 }}>What you get</h2>
          <ul style={{ lineHeight: 1.8 }}>
            <li>Live doubt sessions and mentor feedback</li>
            <li>Real-world projects for your portfolio</li>
            <li>Completion certificate with Sajilogyaan LMS</li>
            <li>Access to exclusive Pro+ courses</li>
          </ul>
          <button className="outline-btn" style={{ marginTop: 24 }} onClick={() => navigate("/courses")}>
            Browse free courses
          </button>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Academy;
