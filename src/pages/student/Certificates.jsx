import React, { useEffect, useRef, useState } from "react";
import StudentPageLayout from "./StudentPageLayout";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "../../styles/StudentProfile.css";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_PREFIXES = ["/api/v1", "/api"];
const SYSTEM_NAME = "Sajilo Gyann";

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

const safeStr = (v, fallback = "—") => {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
};

export default function Certificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewCert, setPreviewCert] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const certRefs = useRef({});

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const token = getToken();
        for (const p of API_PREFIXES) {
          const res = await fetch(`${API_HOST}${p}/certificates/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setCertificates(data?.certificates || []);
            break;
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchCertificates();
  }, []);

  const handlePreview = async (cert) => {
    setPreviewCert(cert);
    
    // Mark as viewed if not already viewed
    if (!cert.firstViewedAt) {
      try {
        const token = getToken();
        for (const p of API_PREFIXES) {
          const res = await fetch(`${API_HOST}${p}/certificates/${cert.certificateNo}/view`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) break;
        }
      } catch (e) {
        console.error("Failed to mark as viewed:", e);
      }
    }
  };

  const handleDownload = async (cert) => {
    const certId = String(cert._id || cert.certificateNo || "");
    const sourceEl = certRefs.current?.[certId];

    if (!sourceEl) {
      alert("Certificate preview is not ready. Click Preview first, then Download.");
      return;
    }

    try {
      setDownloadingId(cert._id);
      const token = getToken();
      
      // Mark as downloaded
      if (cert.certificateNo) {
        for (const p of API_PREFIXES) {
          const res = await fetch(`${API_HOST}${p}/certificates/${cert.certificateNo}/download`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) break;
        }
      }

      // Wait for fonts
      try {
        await document.fonts?.ready;
      } catch {}

      // Clone the cert into a hidden fixed-size stage
      const stage = document.createElement("div");
      stage.setAttribute("aria-hidden", "true");
      stage.style.position = "fixed";
      stage.style.left = "-10000px";
      stage.style.top = "0";
      stage.style.width = "1200px";
      stage.style.padding = "0";
      stage.style.margin = "0";
      stage.style.background = "#ffffff";
      stage.style.zIndex = "-1";

      const clone = sourceEl.cloneNode(true);

      // Force predictable sizing
      clone.style.width = "1200px";
      clone.style.height = "675px";
      clone.style.maxWidth = "none";
      clone.style.maxHeight = "none";
      clone.style.transform = "none";
      clone.style.overflow = "hidden";

      stage.appendChild(clone);
      document.body.appendChild(stage);

      // Wait for layout
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      const canvas = await html2canvas(clone, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1200,
        windowHeight: 675,
      });

      document.body.removeChild(stage);

      const imgData = canvas.toDataURL("image/png", 1.0);

      // A4 Landscape export
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const margin = 18;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;

      const imgW = canvas.width;
      const imgH = canvas.height;

      const ratio = Math.min(maxW / imgW, maxH / imgH);
      const renderW = imgW * ratio;
      const renderH = imgH * ratio;

      const x = (pageW - renderW) / 2;
      const y = (pageH - renderH) / 2;

      pdf.addImage(imgData, "PNG", x, y, renderW, renderH, undefined, "FAST");

      const certNoSafe = String(cert.certificateNo || "CERT")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_-]+/g, "");

      const safeFile = `${certNoSafe}_${cert.studentName}_${cert.courseTitle}`
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_-]+/g, "");

      pdf.save(`${safeFile}.pdf`);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to download certificate");
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <StudentPageLayout title="My Certificates" activePath="/student/certificates">
      {loading ? (
        <div className="certificate-placeholder">
          <p>Loading certificates…</p>
        </div>
      ) : certificates.length === 0 ? (
        <div className="certificate-placeholder">
          <p>No certificates available</p>
          <p className="small-muted">
            Complete courses with <b>50%</b> or higher to generate certificate.
          </p>
        </div>
      ) : null}

      {!loading && certificates.length > 0 && (
        <div className="cert-list">
          {certificates.map((cert) => {
            const certId = String(cert._id || cert.certificateNo || "");
            const gpaPointsText = cert.gpaPoints != null ? String(cert.gpaPoints) : safeStr(cert.gpaPoints, "—");
            
            return (
              <div key={cert._id} className="cert-item">
                <div className="cert-item-left">
                  <div className="cert-badge">SG</div>
                  <div>
                    <div className="cert-course">{cert.courseTitle || "Untitled Course"}</div>
                    <div className="cert-meta">
                      <span>GPA: {safeStr(cert.gpaLetter, "—")}</span>
                      <span className="dot">•</span>
                      <span>GPA Points: {gpaPointsText}</span>
                      <span className="dot">•</span>
                      <span>Cert No: {safeStr(cert.certificateNo, "Not issued yet")}</span>
                      {cert.downloadCount > 0 && (
                        <>
                          <span className="dot">•</span>
                          <span>Downloaded {cert.downloadCount} time{cert.downloadCount !== 1 ? "s" : ""}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="cert-item-actions">
                  <button className="btn-lite" onClick={() => handlePreview(cert)}>
                    Preview
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => handleDownload(cert)}
                    disabled={downloadingId === cert._id}
                  >
                    {downloadingId === cert._id ? "Generating…" : "Download"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewCert && (
        <div className="sg-modal-overlay" onClick={() => setPreviewCert(null)}>
          <div className="sg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sg-modal-top">
              <div>
                <h3 style={{ margin: 0 }}>Certificate Preview</h3>
                <p className="sub-text" style={{ margin: "6px 0 0" }}>
                  {previewCert.courseTitle} · GPA {safeStr(previewCert.gpaLetter, "—")} · GPA Points{" "}
                  {previewCert.gpaPoints != null ? String(previewCert.gpaPoints) : safeStr(previewCert.gpaPoints, "—")}
                </p>
              </div>
              <button className="btn-close" onClick={() => setPreviewCert(null)}>
                ✕
              </button>
            </div>

            <div
              ref={(node) => {
                if (node) {
                  const certId = String(previewCert._id || previewCert.certificateNo || "");
                  certRefs.current[certId] = node;
                }
              }}
              className="sg-cert"
            >
              <div className="sg-top">
                <div className="sg-brand">
                  <div className="sg-logoMark">SG</div>
                  <div className="sg-brandText">
                    <div className="sg-brandName">{SYSTEM_NAME}</div>
                    <div className="sg-brandSmall">Learning Management System</div>
                  </div>
                </div>

                <div className="sg-titleWrap">
                  <div className="sg-title">CERTIFICATE</div>
                  <div className="sg-subtitle">OF ACHIEVEMENT</div>
                </div>

                <div className="sg-rightStack">
                  <div className="sg-certNoCard">
                    <div className="sg-certNoValue">{safeStr(previewCert.certificateNo, "Not issued yet")}</div>
                  </div>

                  <div className="sg-award">
                    <div className="sg-awardTop">{new Date(previewCert.issuedAt).getFullYear()}</div>
                  </div>
                </div>
              </div>

              <div className="sg-strip" />

              <div className="sg-body">
                <div className="sg-present">THIS CERTIFICATE IS PROUDLY PRESENTED TO</div>

                <div className="sg-name">{previewCert.studentName || "Student"}</div>

                <div className="sg-courseLine">
                  for successfully completing the course <b>{previewCert.courseTitle || "Course"}</b>
                </div>

                <div className="sg-praise">
                  The learner has demonstrated strong understanding, consistency, and discipline and securing
                  the GPA: <b>{safeStr(previewCert.gpaLetter, "—")}</b> with GPA points{" "}
                  <b>{previewCert.gpaPoints != null ? String(previewCert.gpaPoints) : safeStr(previewCert.gpaPoints, "—")}</b>{" "}
                  with successful completion and admirable commitment.
                </div>

                <div className="sg-desc">
                  This certificate is digitally generated by <b>{SYSTEM_NAME}</b> and can be verified using
                  the Certificate Number shown in the header.
                </div>

                <div className="sg-bottomRow">
                  <div className="sg-signBox">
                    <div className="sg-dsig">{SYSTEM_NAME}</div>
                    <div className="sg-signLabel">DIGITAL SIGNATURE</div>
                    <div className="sg-signSub">Authorized Signatory</div>
                  </div>

                  <div className="sg-site">{SYSTEM_NAME.toLowerCase().replace(/\s+/g, "")}.com</div>

                  <div className="sg-dateBox">
                    <div className="sg-signLabel">
                      DATE: {new Date(previewCert.issuedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="sg-watermark">{SYSTEM_NAME}</div>
            </div>

            <div className="sg-modal-actions">
              <button className="btn-lite" onClick={() => setPreviewCert(null)}>
                Close
              </button>
              <button
                className="btn-primary"
                onClick={() => handleDownload(previewCert)}
                disabled={downloadingId === previewCert._id}
              >
                {downloadingId === previewCert._id ? "Generating…" : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </StudentPageLayout>
  );
}
