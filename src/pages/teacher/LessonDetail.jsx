// src/pages/teacher/LessonDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../../styles/LessonDetail.css";
import { useNavigate, useParams } from "react-router-dom";
import TeacherSidebar from "./TeacherSidebar";
import NavbarAfterLogin from "./NavbarAfterLogin";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_BASE_URL = `${API_HOST}/api`;
const FILE_BASE_URL = API_HOST;

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

async function apiJson(path, { method = "GET", body } = {}) {
  const token = getToken();
  if (!token) throw new Error("Token not found. Please login again.");

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Failed to fetch: Backend not reachable.");
  }

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : null;

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

const LessonDetail = () => {
  const navigate = useNavigate();
  const { id, chapterId } = useParams();

  const [activeTab, setActiveTab] = useState("course");

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showAllMcqs, setShowAllMcqs] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const user = useMemo(() => {
    try {
      const raw =
        localStorage.getItem("bs_user") || sessionStorage.getItem("bs_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const fileUrl = (p) => (p ? `${FILE_BASE_URL}${p}` : "#");

  const loadLesson = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiJson(`/teacher/courses/${id}/chapters/${chapterId}`, {
        method: "GET",
      });
      setLesson(data?.chapter || null);
      setShowAllMcqs(false);
    } catch (e) {
      setLesson(null);
      setError(e.message || "Failed to load lesson");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLesson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, chapterId]);


  const createdAt = useMemo(() => {
    if (!lesson?.createdAt) return "-";
    return new Date(lesson.createdAt).toLocaleString();
  }, [lesson]);

  const counts = useMemo(() => {
    const materials = Array.isArray(lesson?.materials) ? lesson.materials.length : 0;
    const notesFiles = Array.isArray(lesson?.notes?.files) ? lesson.notes.files.length : 0;
    const taskFiles = Array.isArray(lesson?.taskFiles) ? lesson.taskFiles.length : 0;
    const mcqs = Array.isArray(lesson?.mcqs) ? lesson.mcqs.length : 0;
    const hasVideo = !!lesson?.video?.path;
    const hasCaseFile = !!lesson?.caseStudy?.file?.path;
    const caseQuestions = Array.isArray(lesson?.caseStudy?.questions)
      ? lesson.caseStudy.questions.length
      : 0;

    return { materials, notesFiles, taskFiles, mcqs, hasVideo, hasCaseFile, caseQuestions };
  }, [lesson]);

  const FileList = ({ items }) => {
    if (!Array.isArray(items) || items.length === 0) return null;

    return (
      <div className="file-chips">
        {items.map((f, i) => (
          <a
            key={`${f?.fileName || "file"}-${i}`}
            href={fileUrl(f.path)}
            target="_blank"
            rel="noreferrer"
            className="file-chip"
            title={f.originalName || f.fileName}
          >
            <span className="file-chip-icon">📎</span>
            <span className="file-chip-name">{f.originalName || f.fileName}</span>
          </a>
        ))}
      </div>
    );
  };

  const mcqItems = useMemo(() => {
    const all = Array.isArray(lesson?.mcqs) ? lesson.mcqs : [];
    return showAllMcqs ? all : all.slice(0, 5);
  }, [lesson, showAllMcqs]);

  const remaining = useMemo(() => {
    const total = Array.isArray(lesson?.mcqs) ? lesson.mcqs.length : 0;
    return total > 5 ? total - 5 : 0;
  }, [lesson]);

  // ✅ NEW: Delete lesson
  const handleDelete = async () => {
    const ok = window.confirm("Are you sure you want to delete this lesson/chapter?");
    if (!ok) return;

    setDeleting(true);
    try {
      await apiJson(`/teacher/courses/${id}/chapters/${chapterId}`, {
        method: "DELETE",
      });
      alert("✅ Lesson deleted");
      navigate(`/course-detail/${id}`);
    } catch (e) {
      alert(e.message || "Failed to delete lesson");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="teacher-dashboard-layout">
      {/* NAVBAR */}
      <NavbarAfterLogin user={user} />

      {/* BODY */}
      <div className="teacher-body">
        <TeacherSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="teacher-content">
          <div className="lesson-detail-page">
            {/* Top bar */}
            <div className="lesson-topbar">
              <button className="back-btn" type="button" onClick={() => navigate(-1)}>
                ← Back
              </button>

              {/* ✅ NEW ACTIONS */}
              <div className="lesson-actions">
                <button
                  type="button"
                  className="edit-btn"
                  onClick={() => navigate(`/teacher/courses/${id}/chapters/${chapterId}/edit`)}
                >
                  ✏️ Edit
                </button>

                <button
                  type="button"
                  className="delete-btn"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "🗑 Delete"}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="skeleton-card">
                <div className="sk-line sk-title" />
                <div className="sk-line" />
                <div className="sk-line" />
              </div>
            ) : error ? (
              <div className="lesson-error">
                <div className="lesson-error-title">❌ Error</div>
                <div className="lesson-error-msg">{error}</div>
                <div className="lesson-error-actions">
                  <button className="submit-btn" type="button" onClick={loadLesson}>
                    Retry
                  </button>
                  <button className="cancel-btn" type="button" onClick={() => navigate(-1)}>
                    Go Back
                  </button>
                </div>
              </div>
            ) : !lesson ? (
              <div className="empty-state">
                <div className="empty-icon">📘</div>
                <h3>No lesson found</h3>
                <p>This lesson may have been removed or you don’t have access.</p>
                <button className="submit-btn" type="button" onClick={() => navigate(-1)}>
                  Back
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="lesson-hero">
                  <div className="lesson-hero-left">
                    <h2 className="lesson-title">{lesson.chapterName}</h2>
                    <p className="lesson-subtitle">{lesson.description}</p>

                    <div className="lesson-meta-row">
                      <div className="meta-pill">
                        <span className="meta-label">Uploaded</span>
                        <span className="meta-value">{createdAt}</span>
                      </div>
                      <div className="meta-pill">
                        <span className="meta-label">MCQs</span>
                        <span className="meta-value">{counts.mcqs}</span>
                      </div>
                      <div className="meta-pill">
                        <span className="meta-label">Materials</span>
                        <span className="meta-value">{counts.materials}</span>
                      </div>
                      <div className="meta-pill">
                        <span className="meta-label">Tasks</span>
                        <span className="meta-value">{counts.taskFiles}</span>
                      </div>
                    </div>
                  </div>

                  <div className="lesson-hero-right">
                    <div className="stat-card">
                      <div className="stat-title">Video</div>
                      <div className="stat-value">{counts.hasVideo ? "Yes" : "No"}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-title">Notes Files</div>
                      <div className="stat-value">{counts.notesFiles}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-title">Case Study</div>
                      <div className="stat-value">{counts.hasCaseFile ? "Yes" : "No"}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-title">Case Questions</div>
                      <div className="stat-value">{counts.caseQuestions}</div>
                    </div>
                  </div>
                </div>

                {/* Content grid */}
                <div className="lesson-grid">
                  {/* Video Section */}
                  <div className="lesson-section full">
                    <div className="section-head">
                      <h3>📹 Lesson Video</h3>
                      <span className="section-badge">{counts.hasVideo ? "Available" : "—"}</span>
                    </div>
                    {lesson?.video?.path ? (
                      <div className="video-container">
                        <video
                          controls
                          style={{
                            width: "100%",
                            maxWidth: "800px",
                            borderRadius: "8px",
                            backgroundColor: "#000",
                          }}
                          src={fileUrl(lesson.video.path)}
                        >
                          Your browser does not support the video tag.
                        </video>
                        <div style={{ marginTop: "12px" }}>
                          <a
                            href={fileUrl(lesson.video.path)}
                            target="_blank"
                            rel="noreferrer"
                            className="file-chip"
                            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                          >
                            <span className="file-chip-icon">📥</span>
                            <span className="file-chip-name">
                              {lesson.video.originalName || lesson.video.fileName} 
                              {lesson.video.size ? ` (${(lesson.video.size / 1024 / 1024).toFixed(2)} MB)` : ""}
                            </span>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <p className="muted">No video uploaded for this lesson.</p>
                    )}
                  </div>

                  <div className="lesson-section">
                    <div className="section-head">
                      <h3>📎 Materials</h3>
                      <span className="section-badge">{counts.materials}</span>
                    </div>
                    {counts.materials === 0 ? <p className="muted">No materials uploaded.</p> : <FileList items={lesson.materials} />}
                  </div>

                  <div className="lesson-section">
                    <div className="section-head">
                      <h3>📝 Notes</h3>
                      <span className="section-badge">{counts.notesFiles}</span>
                    </div>
                    {lesson?.notes?.text ? <div className="note-box">{lesson.notes.text}</div> : <p className="muted">No notes text.</p>}
                    {counts.notesFiles === 0 ? null : <FileList items={lesson.notes.files} />}
                  </div>

                  <div className="lesson-section">
                    <div className="section-head">
                      <h3>✅ Tasks</h3>
                      <span className="section-badge">{counts.taskFiles}</span>
                    </div>
                    {counts.taskFiles === 0 ? <p className="muted">No tasks uploaded.</p> : <FileList items={lesson.taskFiles} />}
                  </div>

                  <div className="lesson-section">
                    <div className="section-head">
                      <h3>📄 Case Study</h3>
                      <span className="section-badge">{counts.hasCaseFile ? "File" : "—"}</span>
                    </div>

                    {lesson?.caseStudy?.file?.path ? (
                      <a className="case-file" href={fileUrl(lesson.caseStudy.file.path)} target="_blank" rel="noreferrer">
                        <span className="file-chip-icon">📄</span>
                        <span className="file-chip-name">
                          {lesson.caseStudy.file.originalName || lesson.caseStudy.file.fileName}
                        </span>
                      </a>
                    ) : (
                      <p className="muted">No case study file.</p>
                    )}

                    {Array.isArray(lesson?.caseStudy?.questions) && lesson.caseStudy.questions.length > 0 ? (
                      <div className="qa-box">
                        <h4>Questions</h4>
                        <ol>
                          {lesson.caseStudy.questions.map((q, idx) => (
                            <li key={idx}>{q}</li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      <p className="muted" style={{ marginTop: 10 }}>
                        No case study questions.
                      </p>
                    )}
                  </div>

                  {/* MCQ Summary */}
                  <div className="lesson-section full">
                    <div className="section-head">
                      <h3>🧩 MCQ Summary</h3>
                      <span className="section-badge">{counts.mcqs}</span>
                    </div>

                    {counts.mcqs === 0 ? (
                      <p className="muted">No MCQs found.</p>
                    ) : (
                      <div className="mcq-summary">
                        <p className="muted" style={{ marginBottom: 10 }}>
                          {showAllMcqs ? "All questions:" : "Showing first 5 questions preview:"}
                        </p>

                        <div className="mcq-list">
                          {mcqItems.map((m, i) => (
                            <div className="mcq-item" key={i}>
                              <div className="mcq-q">
                                <span className="mcq-no">Q{i + 1}.</span> {m.question}
                              </div>

                              <div className="mcq-opts">
                                {(m.options || []).map((op, idx) => (
                                  <span
                                    key={idx}
                                    className={String(op).trim() === String(m.correct).trim() ? "mcq-opt correct" : "mcq-opt"}
                                  >
                                    {op}
                                  </span>
                                ))}
                              </div>

                              <div className="mcq-correct">
                                Correct: <b>{m.correct}</b>
                              </div>
                            </div>
                          ))}
                        </div>

                        {counts.mcqs > 5 && (
                          <div className="mcq-toggle-row">
                            {!showAllMcqs && <p className="muted">And {remaining} more questions…</p>}
                            <button type="button" className="mcq-toggle-btn" onClick={() => setShowAllMcqs((s) => !s)}>
                              {showAllMcqs ? "See less" : "See more"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default LessonDetail;
