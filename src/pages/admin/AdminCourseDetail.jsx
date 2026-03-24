// src/pages/admin/AdminCourseDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import AdminSidebar from "./AdminSidebar";
import "../../styles/admin.css";

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

const apiFetchCandidates = async (paths, options = {}) => {
  let last = null;
  for (const prefix of API_PREFIXES) {
    for (const p of paths) {
      const url = `${API_HOST}${prefix}${p}`;
      try {
        const res = await fetch(url, options);
        const data = await safeJson(res);
        if (res.ok) return { res, data, url };
        last = { res, data, url };
      } catch (e) {
        last = { error: e?.message || "Network error", url };
      }
    }
  }
  throw new Error(
    last?.data?.message ||
      last?.error ||
      `API not found. Last tried: ${last?.url || "unknown endpoint"}`
  );
};

const normalizeCourse = (c) => {
  const id = c._id || c.id;

  const teacherObj =
    typeof c.teacherId === "object" && c.teacherId !== null ? c.teacherId : null;

  return {
    _id: id,
    name: c.name || c.title || "",
    title: c.title || c.name || "",
    category: c.category || "",
    duration: c.duration || "",
    level: c.level || c.meta?.level || "",
    status: c.status || c.meta?.status || "",
    description: c.description || c.desc || c.meta?.description || "",
    teacherId: teacherObj?._id || c.teacherId || "",
    teacherName:
      teacherObj?.name ||
      c.teacherName ||
      (typeof c.teacherId === "string" ? "" : ""),
    teacherEmail: teacherObj?.email || "",
    createdAt: c.createdAt || null,
    updatedAt: c.updatedAt || null,
    raw: c,
  };
};

const normalizeChapter = (ch, idx) => {
  const title =
    ch.chapterName ||
    ch.title ||
    ch.name ||
    ch.chapterTitle ||
    ch.lessonTitle ||
    ch.moduleTitle ||
    `Chapter ${idx + 1}`;

  const files =
    ch.files ||
    ch.attachments ||
    ch.lessonFiles ||
    ch.resources ||
    ch.materials ||
    [];

  return {
    _id: ch._id || ch.id || `${idx}`,
    title,
    files: Array.isArray(files) ? files : [],
    raw: ch,
  };
};

const normalizeQuiz = (q, idx) => {
  return {
    _id: q._id || q.id || `${idx}`,
    title: q.title || q.name || q.quizTitle || q.chapterTitle || `Quiz ${idx + 1}`,
    totalQuestions:
      q.totalQuestions ||
      q.questions?.length ||
      q.items?.length ||
      q.mcqs?.length ||
      null,
    raw: q,
  };
};

export default function AdminCourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const stateCourse = location.state?.course || null;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("course");

  const token = getToken();
  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [course, setCourse] = useState(stateCourse ? normalizeCourse(stateCourse) : null);
  const [chapters, setChapters] = useState([]);
  const [chapterGroups, setChapterGroups] = useState([]);
  const [inlineMcqTotal, setInlineMcqTotal] = useState(0);
  const [quizzes, setQuizzes] = useState([]);

  const handleMenuClick = (secId) => {
    setActiveSection(secId);
    if (secId === "course") return navigate("/admin/courses");
    if (secId === "teacher") return navigate("/admin/teachers");
    if (secId === "quiz") return navigate("/admin/quizzes");
    if (secId === "case") return navigate("/admin/casestudies");
    if (secId === "analytics") return navigate("/admin/analytics");
    return navigate("/admin-dashboard");
  };

  const loadCourse = async () => {
    setErr("");
    setLoading(true);

    try {
      // ✅ prefer FULL endpoint (course + chapters + quizzes)
      const { data } = await apiFetchCandidates(
        [`/admin/courses/${id}/full`, `/admin/courses/${id}`],
        { method: "GET", headers: authHeaders }
      );

      const c = data.course || data.data || data;
      setCourse(normalizeCourse(c));

      // from FULL endpoint:
      const chList = Array.isArray(data.chapters) ? data.chapters : (c.chapters || c.lessons || []);
      const qList = Array.isArray(data.quizzes) ? data.quizzes : [];
      const groups = Array.isArray(data.chapterGroups) ? data.chapterGroups : [];

      setChapters((Array.isArray(chList) ? chList : []).map(normalizeChapter));
      setChapterGroups(groups);
      setInlineMcqTotal(Number(data.inlineMcqTotal) || 0);
      setQuizzes((Array.isArray(qList) ? qList : []).map(normalizeQuiz));
    } catch (e) {
      setErr(e?.message || "Failed to load course");
      setCourse(null);
      setChapters([]);
      setChapterGroups([]);
      setInlineMcqTotal(0);
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fmt = (d) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return "-";
    }
  };

  return (
    <div className={`admin-layout ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <Navbar />

      <div className="admin-container">
        <AdminSidebar
          activeSection={activeSection}
          setActiveSection={(secId) => handleMenuClick(secId)}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <main className="admin-main">
          <div
            className="admin-page-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <h2 className="page-title" style={{ marginBottom: 4 }}>
                Course Details
              </h2>
              <p style={{ marginTop: 0, opacity: 0.8 }}>
                Chapters, lessons, case-study uploads, and MCQs per chapter.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="update-btn" onClick={loadCourse} disabled={loading}>
                ↻ Refresh
              </button>
              <button className="update-btn" onClick={() => navigate("/admin/courses")}>
                ← Back
              </button>
            </div>
          </div>

          {err ? (
            <div className="admin-card" style={{ borderLeft: "4px solid #ff4d4f" }}>
              <b>Error:</b> {err}
            </div>
          ) : null}

          {loading ? (
            <div className="admin-card">Loading course…</div>
          ) : !course ? (
            <div className="admin-card">Course not found.</div>
          ) : (
            <div className="admin-card">
              <div className="user-detail-card" style={{ marginTop: 0 }}>
                {/* COURSE INFO */}
                <div className="detail-section">
                  <h3>📘 Course Information</h3>
                  <p><strong>Title:</strong> {course.title || course.name || "-"}</p>
                  <p><strong>Category:</strong> {course.category || "-"}</p>
                  <p><strong>Duration:</strong> {course.duration || "-"}</p>
                  <p><strong>Level:</strong> {course.level || "-"}</p>
                  <p><strong>Status:</strong> {course.status || "-"}</p>

                  <p>
                    <strong>Teacher:</strong>{" "}
                    {course.teacherName ? course.teacherName : "-"}
                    {course.teacherEmail ? ` (${course.teacherEmail})` : ""}
                  </p>

                  <p><strong>Created:</strong> {fmt(course.createdAt)}</p>
                  <p><strong>Updated:</strong> {fmt(course.updatedAt)}</p>

                  {course.description ? (
                    <p><strong>Description:</strong> {course.description}</p>
                  ) : null}
                </div>

                {/* Summary */}
                <div className="detail-section admin-course-structure-summary">
                  <h3>📊 Content overview</h3>
                  <div className="admin-course-summary-grid">
                    <div className="admin-course-summary-pill">
                      <span className="admin-course-summary-label">Chapters</span>
                      <strong>{chapterGroups.length || (chapters.length ? 1 : 0)}</strong>
                    </div>
                    <div className="admin-course-summary-pill">
                      <span className="admin-course-summary-label">Lessons</span>
                      <strong>
                        {chapterGroups.reduce((s, g) => s + (g.totalLessons || 0), 0) ||
                          chapters.length}
                      </strong>
                    </div>
                    <div className="admin-course-summary-pill">
                      <span className="admin-course-summary-label">Case studies uploaded</span>
                      <strong>
                        {chapterGroups.reduce((s, g) => s + (g.lessonsWithCaseStudy || 0), 0)}
                      </strong>
                    </div>
                    <div className="admin-course-summary-pill">
                      <span className="admin-course-summary-label">Quiz questions (in lessons)</span>
                      <strong>{inlineMcqTotal}</strong>
                    </div>
                  </div>
                </div>

                {/* CHAPTERS → lessons, case study, MCQs */}
                <div className="detail-section">
                  <h3>📚 By chapter: lessons, case studies &amp; quizzes</h3>
                  <p style={{ marginTop: 0, opacity: 0.75, fontSize: 14 }}>
                    Each row is one uploaded lesson. Case study = file on that lesson. Quiz count = MCQs saved on that lesson.
                  </p>

                  {chapterGroups.length ? (
                    <div className="admin-chapter-groups">
                      {chapterGroups.map((g) => (
                        <details
                          key={g.chapterName}
                          className="admin-chapter-card"
                          open
                        >
                          <summary className="admin-chapter-summary">
                            <span className="admin-chapter-title">{g.chapterName}</span>
                            <span className="admin-chapter-meta">
                              {g.totalLessons || 0} lesson(s) ·{" "}
                              {g.lessonsWithCaseStudy || 0}{" "}
                              {(g.lessonsWithCaseStudy || 0) === 1 ? "case study" : "case studies"} ·{" "}
                              {g.totalMcqs || 0} MCQ{(g.totalMcqs || 0) === 1 ? "" : "s"}
                            </span>
                          </summary>

                          <div className="admin-lesson-table-wrap">
                            <table className="admin-lesson-table">
                              <thead>
                                <tr>
                                  <th>Lesson</th>
                                  <th>Description</th>
                                  <th>Media / files</th>
                                  <th>Case study</th>
                                  <th>Quiz (MCQs)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(g.lessons || []).map((row, i) => (
                                  <tr key={row._id || i}>
                                    <td>
                                      <span className="admin-lesson-idx">#{i + 1}</span>
                                      <code className="admin-lesson-id">
                                        {row._id ? String(row._id).slice(-8) : "—"}
                                      </code>
                                    </td>
                                    <td>
                                      {row.description
                                        ? row.description.slice(0, 160) +
                                          (row.description.length > 160 ? "…" : "")
                                        : "—"}
                                    </td>
                                    <td>{row.materialCount != null ? row.materialCount : "—"}</td>
                                    <td>
                                      {row.hasCaseStudy ? (
                                        <span className="admin-badge admin-badge--yes">Uploaded</span>
                                      ) : (
                                        <span className="admin-badge admin-badge--no">None</span>
                                      )}
                                    </td>
                                    <td>
                                      <strong>{row.mcqCount ?? 0}</strong>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      ))}
                    </div>
                  ) : chapters.length ? (
                    <ul style={{ marginTop: 8 }}>
                      {chapters.map((ch) => (
                        <li key={ch._id} style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700 }}>{ch.title}</div>
                          <div style={{ opacity: 0.75, fontSize: 13 }}>
                            {ch.files.length ? `${ch.files.length} file(s)` : "No files"}
                          </div>
                          {ch.files.length ? (
                            <ul style={{ marginTop: 6, paddingLeft: 16 }}>
                              {ch.files.map((f, idx) => (
                                <li key={idx} style={{ opacity: 0.9 }}>
                                  {f.originalName || f.name || f.fileName || f.url || JSON.stringify(f)}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ opacity: 0.8 }}>No chapter/lesson data found for this course.</div>
                  )}
                </div>

                {/* Separate quiz documents (if any) */}
                <div className="detail-section">
                  <h3>🧩 Standalone quiz records</h3>
                  <p style={{ marginTop: 0, opacity: 0.75, fontSize: 14 }}>
                    Extra quiz documents linked to this course (if your DB uses a separate collection). Lesson MCQs are counted above.
                  </p>

                  {quizzes.length ? (
                    <div style={{ marginTop: 8 }}>
                      <p style={{ marginTop: 0 }}>
                        Records: <strong>{quizzes.length}</strong>
                      </p>
                      <ul style={{ marginTop: 8 }}>
                        {quizzes.map((q) => (
                          <li key={q._id} style={{ marginBottom: 10 }}>
                            <div style={{ fontWeight: 700 }}>{q.title}</div>
                            <div style={{ opacity: 0.75, fontSize: 13 }}>
                              {q.totalQuestions != null
                                ? `Questions: ${q.totalQuestions}`
                                : "Questions: -"}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div style={{ opacity: 0.8 }}>No separate quiz records for this course.</div>
                  )}
                </div>

                <button className="update-btn" onClick={() => navigate("/admin/courses")}>
                  ← Back to Course Management
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
