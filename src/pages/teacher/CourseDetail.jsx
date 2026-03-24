// src/pages/teacher/CourseDetail.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import "../../styles/CourseDetail.css";
import { useNavigate, useParams } from "react-router-dom";
import TeacherSidebar from "./TeacherSidebar";
import NavbarAfterLogin from "./NavbarAfterLogin";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_PREFIXES = ["/api", "/api/v1"];

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

async function apiJson(path, { method = "GET", body } = {}) {
  const token = getToken();
  if (!token) throw new Error("Token not found. Please login again.");

  let lastError = null;
  
  // Try both API prefixes
  for (const prefix of API_PREFIXES) {
    try {
      const res = await fetch(`${API_HOST}${prefix}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await safeJson(res);

      if (res.ok) {
        return data;
      }

      lastError = new Error(data?.message || data?.error || `Request failed (${res.status})`);
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error("Failed to fetch: Backend not reachable.");
}

const fileMetaLabel = (fileMeta) => {
  if (!fileMeta) return "";
  if (typeof fileMeta === "string") {
    const s = String(fileMeta).split("/").pop();
    return s || fileMeta;
  }
  return (
    fileMeta.originalName ||
    fileMeta.fileName ||
    (fileMeta.path && String(fileMeta.path).split("/").pop()) ||
    "File"
  );
};

/** Build human-readable list of uploads for a lesson/chapter row */
const lessonContentLines = (ch) => {
  if (!ch) return [];
  const lines = [];
  if (ch.video && (ch.video.path || ch.video.originalName || ch.video.fileName)) {
    lines.push({ key: "video", text: `Video: ${fileMetaLabel(ch.video)}` });
  }
  (ch.materials || []).forEach((m, i) => {
    lines.push({ key: `m-${i}`, text: `Material: ${fileMetaLabel(m)}` });
  });
  (ch.notes?.files || []).forEach((f, i) => {
    lines.push({ key: `nf-${i}`, text: `Notes file: ${fileMetaLabel(f)}` });
  });
  if (ch.notes?.text && String(ch.notes.text).trim()) {
    lines.push({ key: "nt", text: "Notes (text)" });
  }
  (ch.taskFiles || []).forEach((f, i) => {
    lines.push({ key: `tf-${i}`, text: `Task: ${fileMetaLabel(f)}` });
  });
  if (ch.caseStudy?.file) {
    lines.push({
      key: "cs",
      text: `Case study: ${fileMetaLabel(ch.caseStudy.file)}`,
    });
  }
  const nMcq = Array.isArray(ch.mcqs) ? ch.mcqs.length : 0;
  if (nMcq > 0) {
    lines.push({ key: "mcq", text: `MCQs: ${nMcq} question(s)` });
  }
  return lines;
};

const CourseDetail = () => {
  const { id } = useParams(); // courseId
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      const raw =
        localStorage.getItem("bs_user") || sessionStorage.getItem("bs_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const [activeTab, setActiveTab] = useState("course");

  // course
  const [course, setCourse] = useState(null);
  const [loadingCourse, setLoadingCourse] = useState(true); // Start with true to show loading

  // chapters
  const [chapters, setChapters] = useState([]);
  const [loadingChapters, setLoadingChapters] = useState(true); // Start with true to show loading

  const [error, setError] = useState("");
  const [deletingChapterId, setDeletingChapterId] = useState(null);

  const loadCourse = useCallback(async () => {
    if (!id) {
      setError("Course ID is missing");
      setLoadingCourse(false);
      return;
    }

    setLoadingCourse(true);
    setError("");
    try {
      const data = await apiJson(`/teacher/courses/${id}`, { method: "GET" });
      console.log("Course data received:", data);
      if (data?.course) {
        setCourse(data.course);
      } else {
        setCourse(null);
        setError("Course data not found in response");
      }
    } catch (e) {
      console.error("Error loading course:", e);
      setCourse(null);
      setError(e.message || "Failed to load course");
    } finally {
      setLoadingCourse(false);
    }
  }, [id]);

  const loadChapters = useCallback(async () => {
    if (!id) {
      setLoadingChapters(false);
      return;
    }

    setLoadingChapters(true);
    try {
      const data = await apiJson(`/teacher/courses/${id}/chapters`, { method: "GET" });
      console.log("Chapters data received:", data);
      const chaptersList = Array.isArray(data?.chapters) ? data.chapters : [];
      setChapters(chaptersList);
      if (chaptersList.length === 0) {
        // Don't set error if chapters list is empty, just show empty state
        console.log("No chapters found for this course");
      }
    } catch (e) {
      console.error("Error loading chapters:", e);
      setChapters([]);
      // Only set error for chapters if it's a critical error
      // Empty chapters list is not an error
    } finally {
      setLoadingChapters(false);
    }
  }, [id]);

  useEffect(() => {
    console.log("CourseDetail mounted/updated with id:", id);
    if (id) {
      // Reset states when id changes
      setCourse(null);
      setChapters([]);
      setError("");
      setLoadingCourse(true);
      setLoadingChapters(true);
      
      // Fetch data
      loadCourse();
      loadChapters();
    } else {
      console.warn("CourseDetail: No course ID provided");
      setError("Course ID is missing");
      setLoadingCourse(false);
      setLoadingChapters(false);
    }
  }, [id, loadCourse, loadChapters]);


  const prettyDuration = useMemo(() => {
    if (!course?.duration) return "-";
    return String(course.duration);
  }, [course]);

  const goLessonDetail = (chapterId) => {
    // ✅ redirect to lesson detail
    navigate(`/teacher/courses/${id}/lessons/${chapterId}`);
  };

  const goEditLesson = (chapterId) => {
    navigate(`/teacher/courses/${id}/chapters/${chapterId}/edit`);
  };

  const handleDeleteLesson = async (e, ch) => {
    e.stopPropagation();
    const label = ch.chapterName?.trim() || "this lesson";
    const ok = window.confirm(`Delete "${label}"? This cannot be undone.`);
    if (!ok) return;

    setDeletingChapterId(ch._id);
    try {
      await apiJson(`/teacher/courses/${id}/chapters/${ch._id}`, { method: "DELETE" });
      await loadChapters();
    } catch (err) {
      alert(err.message || "Failed to delete lesson");
    } finally {
      setDeletingChapterId(null);
    }
  };

  const lessonsWithUploads = useMemo(
    () => chapters.filter((ch) => lessonContentLines(ch).length > 0).length,
    [chapters]
  );

  return (
    <div className="teacher-dashboard-layout">
      {/* NAVBAR */}
      <NavbarAfterLogin user={user} />

      {/* BODY */}
      <div className="teacher-body">
        <TeacherSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="teacher-content">
          <div className="course-detail course-mgmt">
            {loadingCourse ? (
              <div className="course-mgmt-loading">
                <p>Loading course…</p>
              </div>
            ) : error ? (
              <div className="course-mgmt-error">
                <div className="course-mgmt-error__title">Something went wrong</div>
                <p className="course-mgmt-error__msg">{error}</p>
                <div className="course-mgmt-error__actions">
                  <button
                    className="course-mgmt-btn course-mgmt-btn--primary"
                    type="button"
                    onClick={() => {
                      loadCourse();
                      loadChapters();
                    }}
                  >
                    Retry
                  </button>
                  <button
                    className="course-mgmt-btn course-mgmt-btn--ghost"
                    type="button"
                    onClick={() => navigate(-1)}
                  >
                    Go back
                  </button>
                </div>
              </div>
            ) : !course ? (
              <div className="course-mgmt-empty">
                <p>No course found.</p>
                <button
                  className="course-mgmt-btn course-mgmt-btn--ghost"
                  type="button"
                  onClick={() => navigate(-1)}
                >
                  Go back
                </button>
              </div>
            ) : (
              <>
                <div className="course-mgmt-toolbar">
                  <div className="course-mgmt-toolbar__left">
                    <button
                      type="button"
                      className="course-mgmt-btn course-mgmt-btn--ghost"
                      onClick={() => navigate("/view-courses")}
                    >
                      ← My courses
                    </button>
                    <button
                      type="button"
                      className="course-mgmt-btn course-mgmt-btn--ghost"
                      onClick={() => navigate(-1)}
                    >
                      Back
                    </button>
                    <nav className="course-mgmt-breadcrumb" aria-label="Breadcrumb">
                      <span className="course-mgmt-breadcrumb__muted">Teacher</span>
                      <span className="course-mgmt-breadcrumb__sep">/</span>
                      <button
                        type="button"
                        className="course-mgmt-breadcrumb__link"
                        onClick={() => navigate("/view-courses")}
                      >
                        Courses
                      </button>
                      <span className="course-mgmt-breadcrumb__sep">/</span>
                      <span className="course-mgmt-breadcrumb__current">Course</span>
                    </nav>
                  </div>
                  <div className="course-mgmt-toolbar__right">
                    <button
                      type="button"
                      className="course-mgmt-btn course-mgmt-btn--secondary"
                      onClick={() => navigate(`/teacher/courses/${id}/create-lesson`)}
                      title="Add task/assignment files to a new lesson"
                    >
                      Add assignment
                    </button>
                    <button
                      type="button"
                      className="course-mgmt-btn course-mgmt-btn--primary"
                      onClick={() => navigate(`/teacher/courses/${id}/create-lesson`)}
                    >
                      Upload lesson
                    </button>
                  </div>
                </div>

                <header className="course-mgmt-header">
                  <div className="course-mgmt-header__main">
                    <p className="course-mgmt-eyebrow">Course overview</p>
                    <h1 className="course-mgmt-title">
                      {course.title || "Untitled course"}
                    </h1>
                    <p className="course-mgmt-desc">
                      {course.description || "No description provided."}
                    </p>
                  </div>
                  <div className="course-mgmt-kpiStrip" role="list">
                    <div className="course-mgmt-kpi" role="listitem">
                      <span className="course-mgmt-kpi__label">Lessons</span>
                      <span className="course-mgmt-kpi__value">{chapters.length}</span>
                    </div>
                    <div className="course-mgmt-kpi" role="listitem">
                      <span className="course-mgmt-kpi__label">With uploads</span>
                      <span className="course-mgmt-kpi__value">{lessonsWithUploads}</span>
                    </div>
                    <div className="course-mgmt-kpi" role="listitem">
                      <span className="course-mgmt-kpi__label">Duration</span>
                      <span className="course-mgmt-kpi__value">{prettyDuration}</span>
                    </div>
                    <div className="course-mgmt-kpi course-mgmt-kpi--wide" role="listitem">
                      <span className="course-mgmt-kpi__label">Category</span>
                      <span className="course-mgmt-kpi__value course-mgmt-kpi__value--text">
                        {course.category || "—"}
                      </span>
                    </div>
                  </div>
                </header>

                <section
                  className="course-mgmt-panel"
                  aria-labelledby="course-lessons-heading"
                >
                  <div className="course-mgmt-panel__head">
                    <div>
                      <h2 id="course-lessons-heading" className="course-mgmt-panel__title">
                        Uploaded lessons
                      </h2>
                      <p className="course-mgmt-panel__sub">
                        Review content attached to each lesson. Open a row for the full
                        management view.
                      </p>
                    </div>
                    <span className="course-mgmt-panel__badge">
                      {chapters.length} lesson{chapters.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="course-mgmt-tableWrap">
                    {loadingChapters ? (
                      <p className="course-mgmt-tableHint">Loading lessons…</p>
                    ) : chapters.length === 0 ? (
                      <div className="course-mgmt-zero">
                        <p>No lessons yet.</p>
                        <button
                          type="button"
                          className="course-mgmt-btn course-mgmt-btn--primary"
                          onClick={() =>
                            navigate(`/teacher/courses/${id}/create-lesson`)
                          }
                        >
                          Upload first lesson
                        </button>
                      </div>
                    ) : (
                      <table className="course-mgmt-table">
                        <thead>
                          <tr>
                            <th>Lesson</th>
                            <th>Files &amp; content</th>
                            <th>Uploaded</th>
                            <th className="course-mgmt-table__colAction">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chapters.map((ch) => {
                            const contentLines = lessonContentLines(ch);
                            return (
                              <tr
                                key={ch._id}
                                className="course-mgmt-table__row"
                                onClick={() => goLessonDetail(ch._id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    goLessonDetail(ch._id);
                                  }
                                }}
                              >
                                <td className="course-mgmt-table__lesson">
                                  {ch.chapterName || "Untitled lesson"}
                                </td>
                                <td className="course-mgmt-table__content">
                                  {contentLines.length === 0 ? (
                                    <span className="course-mgmt-table__empty">
                                      No files yet
                                    </span>
                                  ) : (
                                    <ul className="course-mgmt-contentList">
                                      {contentLines.map((l) => (
                                        <li key={l.key}>{l.text}</li>
                                      ))}
                                    </ul>
                                  )}
                                </td>
                                <td className="course-mgmt-table__time">
                                  {ch.createdAt
                                    ? new Date(ch.createdAt).toLocaleString()
                                    : "—"}
                                </td>
                                <td
                                  className="course-mgmt-table__colAction"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="course-mgmt-tableActions">
                                    <button
                                      type="button"
                                      className="course-mgmt-tableBtn"
                                      onClick={() => goLessonDetail(ch._id)}
                                    >
                                      Manage
                                    </button>
                                    <button
                                      type="button"
                                      className="course-mgmt-tableBtn course-mgmt-tableBtn--edit"
                                      onClick={() => goEditLesson(ch._id)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="course-mgmt-tableBtn course-mgmt-tableBtn--danger"
                                      disabled={deletingChapterId === ch._id}
                                      title={
                                        deletingChapterId === ch._id
                                          ? "Deleting lesson…"
                                          : "Delete this lesson"
                                      }
                                      onClick={(e) => handleDeleteLesson(e, ch)}
                                    >
                                      {deletingChapterId === ch._id ? "Deleting…" : "Delete"}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {!loadingChapters && chapters.length > 0 && (
                    <p className="course-mgmt-footnote">
                      Tip: Click a row or <strong>Manage</strong> for the lesson console;
                      use <strong>Edit</strong> or <strong>Delete</strong> in the action
                      column without leaving this page.
                    </p>
                  )}
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CourseDetail;
