import React from "react";
import { Link } from "react-router-dom";
import StudentNavbar from "./StudentNavbar";
import Footer from "../../components/Footer";
import "../../styles/howToGetCertificate.css";

const HowToGetCertificate = () => {
  return (
    <>
      <StudentNavbar />

      <main className="htc-page">
        <section className="htc-hero">
          <div className="htc-hero-inner">
            <div>
              <h1 className="htc-title">How to Get Certificate</h1>
              <p className="htc-subtitle">
                Follow these steps in <b>Sajilo Gyann</b> to generate and download your course
                certificate.
              </p>

              <div className="htc-actions">
                <Link to="/student/profile" className="htc-btn htc-btn-primary">
                  Go to Profile
                </Link>
                <Link to="/student/dashboard" className="htc-btn htc-btn-lite">
                  Go to Dashboard
                </Link>
              </div>
            </div>

            <div className="htc-card htc-miniCard">
              <div className="htc-miniTitle">Minimum Requirement</div>
              <div className="htc-miniValue">Total Score ≥ 50%</div>
              <div className="htc-miniNote">
                After eligibility, click <b>Preview</b> to auto-save the certificate in DB.
              </div>
            </div>
          </div>
        </section>

        <section className="htc-content">
          <div className="htc-grid">
            <div className="htc-card">
              <div className="htc-step">
                <div className="htc-stepNo">1</div>
                <div>
                  <h3>Complete MCQs / Chapter Tests</h3>
                  <p>
                    Attempt the MCQs for the course chapters. Your total score is calculated from your
                    attempts.
                  </p>
                </div>
              </div>
            </div>

            <div className="htc-card">
              <div className="htc-step">
                <div className="htc-stepNo">2</div>
                <div>
                  <h3>Get Total Score ≥ 50%</h3>
                  <p>
                    When your total percentage reaches <b>50%</b> or higher, you become eligible for a
                    certificate.
                  </p>
                </div>
              </div>
            </div>

            <div className="htc-card">
              <div className="htc-step">
                <div className="htc-stepNo">3</div>
                <div>
                  <h3>Open Profile → Certificates</h3>
                  <p>
                    Go to your profile page and open the <b>Certificates</b> section.
                  </p>
                </div>
              </div>
            </div>

            <div className="htc-card">
              <div className="htc-step">
                <div className="htc-stepNo">4</div>
                <div>
                  <h3>Click Preview (Auto-Save to DB)</h3>
                  <p>
                    Clicking <b>Preview</b> will first save the certificate in the database (if not
                    already saved) and then show you the certificate preview.
                  </p>
                </div>
              </div>
            </div>

            <div className="htc-card">
              <div className="htc-step">
                <div className="htc-stepNo">5</div>
                <div>
                  <h3>Download PDF</h3>
                  <p>
                    From the preview modal, click <b>Download</b> to generate your PDF certificate.
                  </p>
                </div>
              </div>
            </div>

            <div className="htc-card htc-noteCard">
              <h3>Common Issues</h3>
              <ul className="htc-list">
                <li>
                  If you see <b>Failed to fetch</b>, your backend is not reachable or CORS/token is
                  wrong.
                </li>
                <li>
                  If certificate number shows NA, backend must return proper IDs (courseId, teacherId,
                  chapterId) OR use DB certificateNo.
                </li>
                <li>
                  Always login again if token is missing.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default HowToGetCertificate;
