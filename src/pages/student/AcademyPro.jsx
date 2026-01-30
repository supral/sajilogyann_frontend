import React from "react";
import StudentNavbar from "./StudentNavbar";
import Footer from "../../components/Footer";
import "../../styles/AcademyPro.css";

const AcademyPro = () => {
  // later you can drive this from backend / payment status
  const isProUser = localStorage.getItem("isProUser") === "true";

  const proCourses = [
    {
      id: 1,
      title: "AI & Prompt Engineering Bootcamp",
      level: "Intermediate · 6 Weeks",
      tag: "Most Popular",
    },
    {
      id: 2,
      title: "Data Science with Python (Hands-on)",
      level: "Advanced · 8 Weeks",
      tag: "Project Based",
    },
    {
      id: 3,
      title: "Full-Stack Web Dev with MERN",
      level: "Intermediate · 10 Weeks",
      tag: "Placement Focused",
    },
  ];

  return (
    <>
      <StudentNavbar />

      <main className="pro-page">
        {/* HERO SECTION */}
        <section className="pro-hero">
          <div className="pro-badge-top">
            <i className="fa-solid fa-crown"></i> Academy Pro+ Subscription
          </div>

          <h1>Go Beyond Learning. Get Job-Ready.</h1>
          <p className="pro-subtitle">
            Build skills in AI, Data Science, Web Development and more. Prepare
            for real jobs with advanced, mentor-led courses.
          </p>

          <p className="pro-pricing-text">
            Subscribe for <span className="pro-strike">$30/month</span>{" "}
            <span className="pro-price">$15/month</span>
          </p>

          <button className="pro-cta-btn">
            Start 7-Day Free Trial
          </button>

          <p className="pro-note">No credit card required during trial.</p>
        </section>

        {/* PRO-ONLY COURSES */}
        <section className="pro-courses-section">
          <div className="pro-section-header">
            <h2>Courses Included in Academy Pro+</h2>
            <p>
              These premium courses are unlocked only for Pro+ subscribers.
              Access content, projects and certificates after payment.
            </p>
          </div>

          <div className="pro-courses-grid">
            {proCourses.map((course) => (
              <div key={course.id} className="pro-course-card">
                <div className="pro-course-header">
                  <span className="pro-course-tag">{course.tag}</span>
                  {!isProUser && (
                    <span className="pro-course-lock">
                      <i className="fa-solid fa-lock"></i> Pro+ Only
                    </span>
                  )}
                </div>

                <h3>{course.title}</h3>
                <p className="pro-course-level">{course.level}</p>
                <ul className="pro-course-points">
                  <li>✔ Live doubt sessions & mentor feedback</li>
                  <li>✔ Real-world projects for your portfolio</li>
                  <li>✔ Completion certificate with BlueSheep LMS</li>
                </ul>

                {isProUser ? (
                  <button className="pro-course-btn primary">
                    Go to Course
                  </button>
                ) : (
                  <button className="pro-course-btn disabled">
                    Unlock with Pro+
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* SMALL INFO SECTION */}
        <section className="pro-info-strip">
          <div>
            <h4>Cancel anytime</h4>
            <p>No hidden charges. Stop subscription in 1 click.</p>
          </div>
          <div>
            <h4>Job-Ready Skills</h4>
            <p>Industry-aligned curriculum designed with experts.</p>
          </div>
          <div>
            <h4>Certificates & Projects</h4>
            <p>Showcase your work to recruiters with confidence.</p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default AcademyPro;
