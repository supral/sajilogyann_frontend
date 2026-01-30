import React, { useMemo, useState } from "react";
import "../styles/about.css";
import { useNavigate } from "react-router-dom";

const About = () => {
  const navigate = useNavigate();

  const categories = useMemo(
    () => [
      "Popular",
      "Leadership Program",
      "Organizational Behavior",
      "Principles of Management",
      "Principles of Marketing",
      "Sociology",
      "Psychology",
      "C Programming",
      "Java",
      "Advance Java",
      "Information Technology",
    ],
    []
  );

  const [active, setActive] = useState("Popular");

  return (
    <div className="about-ui">
      {/* Top Header */}
      <section className="about-ui-hero">
        <h1>About Sajilo Gyann</h1>
        <p>
          Learn smarter with structured courses, chapter-wise lessons, notes, tasks and MCQ practice —
          built for students and teachers.
        </p>
      </section>

      <div className="about-ui-layout">
        {/* LEFT SIDEBAR */}
        <aside className="about-ui-sidebar">
          <button
            className={`side-pill ${active === "Popular" ? "active" : ""}`}
            onClick={() => setActive("Popular")}
          >
            Popular
          </button>

          <div className="side-list">
            {categories.slice(1).map((c) => (
              <button
                key={c}
                className={`side-item ${active === c ? "active" : ""}`}
                onClick={() => setActive(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </aside>

        {/* RIGHT CONTENT */}
        <main className="about-ui-main">
          {/* Banner (like your screenshot) */}
          <div className="about-ui-banner">
            <div>
              <h3>Build your career with Sajilo Gyann</h3>
              <p>Structured learning + MCQ practice + downloadable notes and materials.</p>
            </div>

            <div className="banner-right">
              <span className="banner-price">Trusted Platform</span>
              <button className="banner-btn" onClick={() => navigate("/login")}>
                Get Started
              </button>
            </div>
          </div>

          {/* Section Title */}
          <div className="about-ui-section-title">
            <h2>Why Sajilo Gyann?</h2>
            <div className="line" />
          </div>

          {/* Cards */}
          <div className="about-ui-cards">
            <div className="a-card">
              <div className="a-icon">📚</div>
              <h4>Chapter-wise Learning</h4>
              <p>
                Courses are organized into lessons/chapters so students can learn step-by-step without confusion.
              </p>
            </div>

            <div className="a-card">
              <div className="a-icon">📝</div>
              <h4>Notes & Materials</h4>
              <p>
                Teachers can upload notes, files, tasks and case study resources. Students can access everything in one place.
              </p>
            </div>

            <div className="a-card">
              <div className="a-icon">🧩</div>
              <h4>MCQ Practice</h4>
              <p>
                Practice MCQs to test understanding and improve performance with fast revision.
              </p>
            </div>

            <div className="a-card">
              <div className="a-icon">✅</div>
              <h4>Teacher Dashboard</h4>
              <p>
                Teachers manage courses, upload lessons, tasks and track everything cleanly.
              </p>
            </div>
          </div>

          {/* Mission + Contact (two-column like modern UI) */}
          <div className="about-ui-grid2">
            <div className="grid-box">
              <h3>Our Mission</h3>
              <p>
                Make learning simple, practical, and accessible. We focus on features that help students actually learn
                and help teachers manage content without stress.
              </p>

              <ul className="tick-list">
                <li>Clear course structure</li>
                <li>Real learning materials</li>
                <li>Practice through MCQs</li>
                <li>Easy content management</li>
              </ul>
            </div>

            <div className="grid-box">
              <h3>Contact</h3>
              <p className="muted">
                Want to collaborate, upload courses, or get support?
              </p>

              <div className="contact-row">
                <span className="label">Support</span>
                <span className="value">support@sajilogyann.com</span>
              </div>
              <div className="contact-row">
                <span className="label">Partnership</span>
                <span className="value">partnership@sajilogyann.com</span>
              </div>
              <div className="contact-row">
                <span className="label">Location</span>
                <span className="value">Nepal</span>
              </div>

              <button className="main-cta" onClick={() => navigate("/courses")}>
                Explore Courses
              </button>
            </div>
          </div>

          {/* Bottom spacing */}
          <div style={{ height: 30 }} />
        </main>
      </div>
    </div>
  );
};

export default About;
