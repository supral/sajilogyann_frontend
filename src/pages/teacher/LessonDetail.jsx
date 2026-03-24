// src/pages/teacher/LessonDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../../styles/LessonDetail.css";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import TeacherSidebar from "./TeacherSidebar";
import NavbarAfterLogin from "./NavbarAfterLogin";
import OfficeFileViewer from "../../components/OfficeFileViewer";

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

const normalizeUpload = (fileMeta) => {
  if (!fileMeta) return null;
  const path = typeof fileMeta === "string" ? fileMeta : fileMeta.path || "";
  if (!path) return null;
  const url = path.startsWith("http") ? path : `${FILE_BASE_URL}${path}`;
  return {
    url,
    name:
      typeof fileMeta === "string"
        ? "File"
        : fileMeta.originalName || fileMeta.fileName || "File",
    size: typeof fileMeta === "object" ? fileMeta.size || 0 : 0,
  };
};

const LessonDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id, chapterId } = useParams();

  const [activeTab, setActiveTab] = useState("course");

  const [lesson, setLesson] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showAllMcqs, setShowAllMcqs] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [mediaIndex, setMediaIndex] = useState(0);
  const [officeViewerError, setOfficeViewerError] = useState({});
  const [useGoogleViewer, setUseGoogleViewer] = useState({});

  const lessonPathBase = location.pathname.includes("/lessons/")
    ? `/teacher/courses/${id}/lessons`
    : `/teacher/courses/${id}/chapters`;

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

  const loadChapters = async () => {
    if (!id) return;
    try {
      const data = await apiJson(`/teacher/courses/${id}/chapters`, { method: "GET" });
      setChapters(Array.isArray(data?.chapters) ? data.chapters : []);
    } catch {
      setChapters([]);
    }
  };

  useEffect(() => {
    loadLesson();
    loadChapters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, chapterId]);

  useEffect(() => {
    setMediaIndex(0);
    setOfficeViewerError({});
    setUseGoogleViewer({});
  }, [chapterId]);

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

  const chapterNav = useMemo(() => {
    const list = chapters;
    const idx = list.findIndex((c) => String(c?._id) === String(chapterId));
    if (idx < 0) return { idx: -1, total: list.length, prevId: null, nextId: null };
    return {
      idx,
      total: list.length,
      prevId: idx > 0 ? list[idx - 1]._id : null,
      nextId: idx < list.length - 1 ? list[idx + 1]._id : null,
    };
  }, [chapters, chapterId]);

  const allMedia = useMemo(() => {
    if (!lesson) return [];
    const items = [];
    const notesText = lesson?.notes?.text?.trim();
    if (notesText) {
      items.push({ kind: "notesText", category: "Notes (text)", text: notesText });
    }
    if (lesson?.video?.path) {
      const u = normalizeUpload(lesson.video);
      if (u) items.push({ kind: "file", category: "Video", ...u, fileKind: "video" });
    }
    (lesson.materials || []).forEach((m, i) => {
      const u = normalizeUpload(m);
      if (u) items.push({ kind: "file", category: "Materials", ...u, fileKind: "material", originalIndex: i });
    });
    (lesson.notes?.files || []).forEach((m, i) => {
      const u = normalizeUpload(m);
      if (u) items.push({ kind: "file", category: "Notes file", ...u, fileKind: "notesFile", originalIndex: i });
    });
    (lesson.taskFiles || []).forEach((m, i) => {
      const u = normalizeUpload(m);
      if (u) items.push({ kind: "file", category: "Task", ...u, fileKind: "task", originalIndex: i });
    });
    if (lesson?.caseStudy?.file?.path) {
      const u = normalizeUpload(lesson.caseStudy.file);
      if (u) items.push({ kind: "file", category: "Case study", ...u, fileKind: "case", originalIndex: 0 });
    }
    return items;
  }, [lesson]);

  const safeMediaIndex = Math.min(mediaIndex, Math.max(0, allMedia.length - 1));
  const currentMedia = allMedia.length ? allMedia[safeMediaIndex] : null;

  const isPublicUrl = (url) => {
    if (!url) return false;
    const urlStr = String(url).toLowerCase();
    return (
      !urlStr.includes("localhost") &&
      !urlStr.includes("127.0.0.1") &&
      !urlStr.includes("192.168.") &&
      !urlStr.includes("10.") &&
      (urlStr.startsWith("http://") || urlStr.startsWith("https://"))
    );
  };

  const guessFileType = (file) => {
    if (file?.fileKind === "video") return "video";
    if (!file?.url) return "download";
    const url = String(file.url).toLowerCase();
    const ext = url.split("?")[0].split(".").pop() || "";
    if (["png", "jpg", "jpeg", "jpe", "gif", "webp", "bmp", "svg", "ico", "tiff", "tif", "avif", "heic", "heif"].includes(ext))
      return "image";
    if (ext === "pdf") return "pdf";
    if (["mp4", "webm", "ogg", "ogv", "mov", "avi", "wmv", "flv", "mkv", "m4v", "3gp"].includes(ext)) return "video";
    if (["mp3", "wav", "ogg", "oga", "m4a", "aac", "flac", "wma"].includes(ext)) return "audio";
    if (["pptx", "ppt", "docx", "doc", "xlsx", "xls", "odt", "ods", "odp"].includes(ext)) return "office";
    if (["txt", "csv", "json", "xml", "html", "htm", "css", "js", "md", "log"].includes(ext)) return "text";
    return "download";
  };

  const getOfficeViewerUrl = (fileUrl, useGoogle = false) => {
    if (useGoogle) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    }
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
  };

  useEffect(() => {
    if (!currentMedia || currentMedia.kind !== "file") return;
    const url = currentMedia.url;
    const ft = guessFileType(currentMedia);
    if (ft === "office" && !isPublicUrl(url)) {
      setOfficeViewerError((prev) => ({ ...prev, [url]: true }));
      setUseGoogleViewer((prev) => {
        const next = { ...prev };
        delete next[url];
        return next;
      });
    } else if (ft === "office") {
      setOfficeViewerError((prev) => {
        const next = { ...prev };
        delete next[url];
        return next;
      });
      setUseGoogleViewer((prev) => {
        const next = { ...prev };
        delete next[url];
        return next;
      });
    }
  }, [currentMedia]);

  useEffect(() => {
    if (allMedia.length === 0) return;
    setMediaIndex((i) => Math.min(i, allMedia.length - 1));
  }, [allMedia.length]);

  const goPrevMedia = () => setMediaIndex((i) => Math.max(0, i - 1));
  const goNextMedia = () => setMediaIndex((i) => Math.min(allMedia.length - 1, i + 1));

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

  const inventoryRows = useMemo(() => {
    if (!lesson) return [];
    const rows = [];
    const pushFile = (type, f) => {
      if (!f?.path) return;
      rows.push({
        type,
        name: f.originalName || f.fileName || "File",
        size: f.size,
        href: fileUrl(f.path),
      });
    };
    if (lesson.video?.path) pushFile("Video", lesson.video);
    (lesson.materials || []).forEach((f) => pushFile("Material", f));
    (lesson.notes?.files || []).forEach((f) => pushFile("Notes file", f));
    (lesson.taskFiles || []).forEach((f) => pushFile("Task", f));
    if (lesson.caseStudy?.file?.path) pushFile("Case study", lesson.caseStudy.file);
    if (lesson.notes?.text && String(lesson.notes.text).trim()) {
      rows.push({
        type: "Notes",
        name: "Text content (see Notes section below)",
        size: null,
        href: null,
      });
    }
    return rows;
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

  const renderTeacherMediaBody = () => {
    if (!currentMedia) {
      return <p className="muted">Nothing to preview for this lesson.</p>;
    }
    if (currentMedia.kind === "notesText") {
      return (
        <div className="lesson-mgmt-previewDocument">
          <div className="lesson-mgmt-previewDocument__bar">
            <span className="lesson-mgmt-previewDocument__badge">Text</span>
            <span className="lesson-mgmt-previewDocument__hint">
              Instructor notes (visible to students when published)
            </span>
          </div>
          <div className="lesson-mgmt-previewDocument__body lesson-media-notes-scroll">
            {currentMedia.text}
          </div>
        </div>
      );
    }
    const file = currentMedia;
    const fileType = guessFileType(file);
    const frameMin = "min(72vh, 900px)";
    const linkBtn = {
      padding: "12px 24px",
      background: "#1976d2",
      color: "white",
      textDecoration: "none",
      borderRadius: "8px",
      display: "inline-block",
    };
    if (fileType === "image") {
      return (
        <img
          src={file.url}
          alt={file.name}
          style={{ maxWidth: "100%", maxHeight: "72vh", objectFit: "contain", display: "block", margin: "0 auto" }}
        />
      );
    }
    if (fileType === "pdf") {
      return (
        <iframe
          src={file.url}
          title={file.name}
          style={{ width: "100%", border: "none", minHeight: frameMin, background: "#fff" }}
        />
      );
    }
    if (fileType === "video") {
      return (
        <video src={file.url} controls style={{ width: "100%", maxHeight: "72vh", borderRadius: 8, background: "#000" }}>
          Your browser does not support the video tag.
        </video>
      );
    }
    if (fileType === "office") {
      if (!isPublicUrl(file.url) || officeViewerError[file.url]) {
        return (
          <div style={{ width: "100%", minHeight: frameMin, background: "#fff", padding: 16, boxSizing: "border-box" }}>
            <OfficeFileViewer fileUrl={file.url} fileName={file.name} />
          </div>
        );
      }
      return (
        <iframe
          src={getOfficeViewerUrl(file.url, useGoogleViewer[file.url])}
          title={file.name}
          allowFullScreen
          style={{ width: "100%", border: "none", minHeight: frameMin, background: "#fff" }}
          onError={() => {
            if (!useGoogleViewer[file.url]) {
              setUseGoogleViewer((prev) => ({ ...prev, [file.url]: true }));
            } else {
              setOfficeViewerError((prev) => ({ ...prev, [file.url]: true }));
            }
          }}
        />
      );
    }
    if (fileType === "audio") {
      return (
        <div style={{ textAlign: "center", padding: 24 }}>
          <audio controls src={file.url} style={{ width: "100%", maxWidth: 560, marginBottom: 16 }}>
            Your browser does not support the audio element.
          </audio>
          <a href={file.url} target="_blank" rel="noreferrer" download style={linkBtn}>
            📥 Download
          </a>
        </div>
      );
    }
    if (fileType === "text") {
      return (
        <iframe
          src={file.url}
          title={file.name}
          style={{ width: "100%", border: "none", minHeight: frameMin, background: "#fff" }}
        />
      );
    }
    return (
      <div style={{ textAlign: "center", padding: 24 }}>
        <p style={{ marginBottom: 12, fontWeight: 600 }}>{file.name}</p>
        <a href={file.url} target="_blank" rel="noreferrer" style={linkBtn}>
          📥 Download file
        </a>
      </div>
    );
  };

  return (
    <div className="teacher-dashboard-layout">
      {/* NAVBAR */}
      <NavbarAfterLogin user={user} />

      {/* BODY */}
      <div className="teacher-body">
        <TeacherSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="teacher-content">
          <div className="lesson-detail-page lesson-mgmt">
            <div className="lesson-mgmt-toolbar">
              <div className="lesson-mgmt-toolbar__left">
                <button
                  type="button"
                  className="lesson-mgmt-btn lesson-mgmt-btn--ghost"
                  onClick={() => navigate(`/course-detail/${id}`)}
                >
                  ← Course
                </button>
                <button
                  type="button"
                  className="lesson-mgmt-btn lesson-mgmt-btn--ghost"
                  onClick={() => navigate(-1)}
                >
                  Back
                </button>
                <nav className="lesson-mgmt-breadcrumb" aria-label="Breadcrumb">
                  <span className="lesson-mgmt-breadcrumb__muted">Teacher</span>
                  <span className="lesson-mgmt-breadcrumb__sep">/</span>
                  <button
                    type="button"
                    className="lesson-mgmt-breadcrumb__link"
                    onClick={() => navigate(`/course-detail/${id}`)}
                  >
                    Course
                  </button>
                  <span className="lesson-mgmt-breadcrumb__sep">/</span>
                  <span className="lesson-mgmt-breadcrumb__current">Lesson</span>
                </nav>
              </div>
              <div className="lesson-mgmt-toolbar__mid">
                {chapterNav.total > 1 && (
                  <div className="lesson-mgmt-lessonSwitch">
                    <button
                      type="button"
                      className="lesson-mgmt-btn lesson-mgmt-btn--ghost lesson-mgmt-btn--sm"
                      disabled={!chapterNav.prevId}
                      onClick={() =>
                        chapterNav.prevId && navigate(`${lessonPathBase}/${chapterNav.prevId}`)
                      }
                    >
                      ← Prev
                    </button>
                    <span className="lesson-mgmt-lessonSwitch__label">
                      {chapterNav.idx >= 0 ? chapterNav.idx + 1 : "—"} / {chapterNav.total}
                    </span>
                    <button
                      type="button"
                      className="lesson-mgmt-btn lesson-mgmt-btn--ghost lesson-mgmt-btn--sm"
                      disabled={!chapterNav.nextId}
                      onClick={() =>
                        chapterNav.nextId && navigate(`${lessonPathBase}/${chapterNav.nextId}`)
                      }
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
              <div className="lesson-mgmt-toolbar__right">
                <button
                  type="button"
                  className="lesson-mgmt-btn lesson-mgmt-btn--primary"
                  onClick={() =>
                    navigate(`/teacher/courses/${id}/chapters/${chapterId}/edit`)
                  }
                >
                  Edit lesson
                </button>
                <button
                  type="button"
                  className="lesson-mgmt-btn lesson-mgmt-btn--danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="lesson-mgmt-panel lesson-mgmt-skeletonWrap">
                <div className="skeleton-card lesson-mgmt-skeleton">
                  <div className="sk-line sk-title" />
                  <div className="sk-line" />
                  <div className="sk-line" />
                </div>
              </div>
            ) : error ? (
              <div className="lesson-mgmt-panel lesson-mgmt-errorPanel">
                <div className="lesson-error-title">Could not load lesson</div>
                <div className="lesson-error-msg">{error}</div>
                <div className="lesson-error-actions">
                  <button
                    className="lesson-mgmt-btn lesson-mgmt-btn--primary"
                    type="button"
                    onClick={loadLesson}
                  >
                    Retry
                  </button>
                  <button
                    className="lesson-mgmt-btn lesson-mgmt-btn--ghost"
                    type="button"
                    onClick={() => navigate(-1)}
                  >
                    Go back
                  </button>
                </div>
              </div>
            ) : !lesson ? (
              <div className="lesson-mgmt-panel lesson-mgmt-emptyPanel">
                <div className="empty-icon">📘</div>
                <h3 className="lesson-mgmt-emptyPanel__title">No lesson found</h3>
                <p className="muted">This lesson may have been removed or you don’t have access.</p>
                <button
                  className="lesson-mgmt-btn lesson-mgmt-btn--primary"
                  type="button"
                  onClick={() => navigate(-1)}
                >
                  Go back
                </button>
              </div>
            ) : (
              <>
                <header className="lesson-mgmt-header">
                  <div className="lesson-mgmt-header__main">
                    <p className="lesson-mgmt-eyebrow">Lesson overview</p>
                    <h1 className="lesson-mgmt-title">{lesson.chapterName}</h1>
                    <p className="lesson-mgmt-desc">{lesson.description}</p>
                    <p className="lesson-mgmt-metaLine">
                      <span className="lesson-mgmt-metaLine__label">Last updated</span>
                      {createdAt}
                    </p>
                  </div>
                  <div className="lesson-mgmt-kpiStrip" role="list">
                    <div className="lesson-mgmt-kpi" role="listitem">
                      <span className="lesson-mgmt-kpi__label">Materials</span>
                      <span className="lesson-mgmt-kpi__value">{counts.materials}</span>
                    </div>
                    <div className="lesson-mgmt-kpi" role="listitem">
                      <span className="lesson-mgmt-kpi__label">Tasks</span>
                      <span className="lesson-mgmt-kpi__value">{counts.taskFiles}</span>
                    </div>
                    <div className="lesson-mgmt-kpi" role="listitem">
                      <span className="lesson-mgmt-kpi__label">Notes files</span>
                      <span className="lesson-mgmt-kpi__value">{counts.notesFiles}</span>
                    </div>
                    <div className="lesson-mgmt-kpi" role="listitem">
                      <span className="lesson-mgmt-kpi__label">Video</span>
                      <span className="lesson-mgmt-kpi__value">{counts.hasVideo ? "Yes" : "No"}</span>
                    </div>
                    <div className="lesson-mgmt-kpi" role="listitem">
                      <span className="lesson-mgmt-kpi__label">Case study</span>
                      <span className="lesson-mgmt-kpi__value">{counts.hasCaseFile ? "Yes" : "No"}</span>
                    </div>
                    <div className="lesson-mgmt-kpi" role="listitem">
                      <span className="lesson-mgmt-kpi__label">MCQs</span>
                      <span className="lesson-mgmt-kpi__value">{counts.mcqs}</span>
                    </div>
                    <div className="lesson-mgmt-kpi" role="listitem">
                      <span className="lesson-mgmt-kpi__label">Case Qs</span>
                      <span className="lesson-mgmt-kpi__value">{counts.caseQuestions}</span>
                    </div>
                  </div>
                </header>

                <section className="lesson-mgmt-panel lesson-mgmt-panel--table" aria-labelledby="lesson-assets-heading">
                  <div className="lesson-mgmt-panel__head">
                    <h2 id="lesson-assets-heading" className="lesson-mgmt-panel__title">
                      Content inventory
                    </h2>
                    <span className="lesson-mgmt-panel__badge">{inventoryRows.length} item(s)</span>
                  </div>
                  <div className="lesson-mgmt-tableWrap">
                    {inventoryRows.length === 0 ? (
                      <p className="lesson-mgmt-emptyTable muted">No uploaded files for this lesson.</p>
                    ) : (
                      <table className="lesson-mgmt-table">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>File / item name</th>
                            <th>Size</th>
                            <th className="lesson-mgmt-table__colAction">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryRows.map((row, idx) => (
                            <tr key={`${row.type}-${idx}-${row.name}`}>
                              <td>
                                <span className="lesson-mgmt-typeTag">{row.type}</span>
                              </td>
                              <td className="lesson-mgmt-table__name">{row.name}</td>
                              <td className="lesson-mgmt-table__size">
                                {row.size
                                  ? row.size >= 1048576
                                    ? `${(row.size / 1048576).toFixed(2)} MB`
                                    : `${(row.size / 1024).toFixed(1)} KB`
                                  : "—"}
                              </td>
                              <td className="lesson-mgmt-table__colAction">
                                {row.href ? (
                                  <a
                                    href={row.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="lesson-mgmt-tableLink"
                                  >
                                    Open
                                  </a>
                                ) : (
                                  <span className="muted">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </section>

                {allMedia.length > 0 && (
                  <section className="lesson-mgmt-panel lesson-media-fullpage" aria-labelledby="lesson-preview-heading">
                    <div className="lesson-mgmt-panel__head lesson-mgmt-panel__head--dark">
                      <div>
                        <h2 id="lesson-preview-heading" className="lesson-mgmt-panel__title">
                          Preview
                        </h2>
                        <p className="lesson-mgmt-panel__sub">
                          Step through all lesson content in one place
                        </p>
                      </div>
                      <span
                        className="lesson-mgmt-panel__badge lesson-mgmt-panel__badge--light lesson-mgmt-panel__badge--counter"
                        title={`Item ${safeMediaIndex + 1} of ${allMedia.length}`}
                      >
                        {safeMediaIndex + 1} / {allMedia.length}
                      </span>
                    </div>
                    <div className="lesson-media-viewport">{renderTeacherMediaBody()}</div>
                    <div className="lesson-media-nav lesson-media-nav--mgmt">
                      <button
                        type="button"
                        className="lesson-mgmt-btn lesson-mgmt-btn--ghost"
                        onClick={goPrevMedia}
                        disabled={safeMediaIndex <= 0}
                      >
                        ← Previous
                      </button>
                      <div className="lesson-media-nav__center">
                        <span className="lesson-media-nav__category">{currentMedia?.category}</span>
                        {currentMedia?.kind === "file" && currentMedia?.name ? (
                          <span className="lesson-media-nav__filename">{currentMedia.name}</span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="lesson-mgmt-btn lesson-mgmt-btn--ghost"
                        onClick={goNextMedia}
                        disabled={safeMediaIndex >= allMedia.length - 1}
                      >
                        Next →
                      </button>
                    </div>
                  </section>
                )}

                <section
                  className="lesson-mgmt-panel lesson-mgmt-detailSections"
                  aria-labelledby="lesson-breakdown-heading"
                >
                  <div className="lesson-mgmt-panel__head">
                    <div>
                      <h2 id="lesson-breakdown-heading" className="lesson-mgmt-panel__title">
                        Content by category
                      </h2>
                      <p className="lesson-mgmt-panel__sub">
                        Same files as above, grouped for quick editing context. Use{" "}
                        <strong>Edit lesson</strong> to change uploads.
                      </p>
                    </div>
                  </div>
                  <div className="lesson-mgmt-detailSections__body">
                <div className="lesson-grid lesson-mgmt-grid">
                  {/* Video Section */}
                  <div className="lesson-section lesson-mgmt-card full">
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

                  <div className="lesson-section lesson-mgmt-card">
                    <div className="section-head">
                      <h3>📎 Materials</h3>
                      <span className="section-badge">{counts.materials}</span>
                    </div>
                    {counts.materials === 0 ? <p className="muted">No materials uploaded.</p> : <FileList items={lesson.materials} />}
                  </div>

                  <div className="lesson-section lesson-mgmt-card">
                    <div className="section-head">
                      <h3>📝 Notes</h3>
                      <span className="section-badge">{counts.notesFiles}</span>
                    </div>
                    {lesson?.notes?.text ? <div className="note-box">{lesson.notes.text}</div> : <p className="muted">No notes text.</p>}
                    {counts.notesFiles === 0 ? null : <FileList items={lesson.notes.files} />}
                  </div>

                  <div className="lesson-section lesson-mgmt-card">
                    <div className="section-head">
                      <h3>✅ Tasks</h3>
                      <span className="section-badge">{counts.taskFiles}</span>
                    </div>
                    {counts.taskFiles === 0 ? <p className="muted">No tasks uploaded.</p> : <FileList items={lesson.taskFiles} />}
                  </div>

                  <div className="lesson-section lesson-mgmt-card">
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
                  <div className="lesson-section lesson-mgmt-card full">
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
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default LessonDetail;
