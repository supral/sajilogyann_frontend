import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/footer.css";

const Footer = () => {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  return (
    <>
      {/* MAIN FOOTER */}
      <footer className="bs-footer">
        <div className="bs-footer-inner">
          {/* FEATURED */}
          <div className="bs-featured">
            <span className="label">FEATURED IN</span>
            <span>Inc.</span>
            <span>Entrepreneur</span>
            <span>Forbes</span>
            <span>The Guardian</span>
            <span>mozilla</span>
            <span>Business Insider</span>
            <span>msn</span>
            <span>WIRED</span>
          </div>

          <div className="divider" />

          {/* GRID */}
          <div className="bs-footer-grid">
            {/* ABOUT */}
            <div>
              <h4>About BlueSheep</h4>
              <p>
                BlueSheep is a learning platform built for students and
                professionals. Learn with structured courses, quizzes,
                certificates, and Academy Pro+.
              </p>

              <p className="hiring">
                Join our team: <span>We are Hiring!</span>
              </p>

              <div className="social">
                <span>Follow us</span>
                <div className="icons">
                  <i className="fa-brands fa-facebook-f" />
                  <i className="fa-brands fa-x-twitter" />
                  <i className="fa-brands fa-instagram" />
                  <i className="fa-brands fa-youtube" />
                  <i className="fa-brands fa-linkedin-in" />
                </div>
              </div>
            </div>

            {/* LINKS */}
            <div>
              <h4>Site Links</h4>
              <ul>
                <li onClick={() => navigate("/about")}>About Us</li>
                <li onClick={() => navigate("/contact")}>Contact Us</li>
                <li onClick={() => navigate("/privacy-policy")}>
                  Privacy Policy
                </li>
                <li onClick={() => navigate("/terms")}>Terms of Service</li>
                <li onClick={() => navigate("/courses")}>Browse Courses</li>
                <li onClick={() => navigate("/academy")}>Academy Pro+</li>
                <li onClick={() => navigate("/faq")}>Help / FAQ</li>
              </ul>
            </div>

            {/* SUBJECTS */}
            <div>
              <h4>Popular Subjects</h4>
              <ul>
                <li>Leadership Program</li>
                <li>Organizational Behavior</li>
                <li>Principles of Management</li>
                <li>Principles of Marketing</li>
                <li>Sociology</li>
                <li>Psychology</li>
                <li>Management of Human Resource</li>
              </ul>
            </div>

            {/* CTA */}
            <div className="cta-box">
              <h4>Start Learning</h4>
              <p>
                Get access to courses, quizzes and certificates. Upgrade with
                Academy Pro+ anytime.
              </p>

              <button
                className="primary-btn"
                onClick={() => navigate("/login")}
              >
                Get Started
              </button>

              <button
                className="outline-btn"
                onClick={() => navigate("/courses")}
              >
                Explore Courses
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ✅ FULL-WIDTH COPYRIGHT (OUTSIDE FOOTER) */}
      <div className="bs-footer-bottom">
        <div className="bs-footer-bottom-inner">
          <p>
            Copyright © {year} BlueSheep. All Rights Reserved.
            <span>•</span>
            <button onClick={() => navigate("/privacy-policy")}>Privacy</button>
            <span>•</span>
            <button onClick={() => navigate("/terms")}>Terms</button>
          </p>
        </div>
      </div>
    </>
  );
};

export default Footer;
