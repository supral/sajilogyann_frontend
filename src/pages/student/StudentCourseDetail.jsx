// src/pages/student/StudentCourseDetail.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StudentNavbar from "./StudentNavbar";
import Footer from "../../components/Footer";
import OfficeFileViewer from "../../components/OfficeFileViewer";
import PDFViewer from "../../components/PDFViewer";
import "../../styles/dashboard.css";
import "../../styles/StudentLessonViewer.css";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_PREFIXES = ["/api/v1", "/api"];

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

/**
 * ✅ Robust URL builder
 * Supports:
 * - absolute http(s)
 * - /uploads/lessons/xxx
 * - uploads/lessons/xxx
 * - xxx.pdf (filename only)  -> /uploads/lessons/xxx.pdf
 */
const buildFileUrl = (p) => {
  if (!p) return "";
  const raw = String(p).trim();
  if (!raw) return "";

  // already absolute
  if (/^https?:\/\//i.test(raw)) return raw;

  const host = API_HOST.endsWith("/") ? API_HOST.slice(0, -1) : API_HOST;

  // if already starts with "/uploads"
  if (raw.startsWith("/uploads/")) return `${host}${raw}`;

  // if starts with "uploads/"
  if (raw.startsWith("uploads/")) return `${host}/${raw}`;

  // if only filename provided
  if (!raw.includes("/")) return `${host}/uploads/lessons/${raw}`;

  // anything else
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `${host}${path}`;
};

const fileName = (f) =>
  f?.originalName || f?.fileName || f?.name || f?.filename || "File";

const normalizeFileMeta = (meta) => {
  if (!meta) return null;
  const path =
    meta?.path ||
    meta?.filePath ||
    meta?.url || // sometimes saved as url
    meta?.fileUrl ||
    meta?.filename;

  const url = buildFileUrl(path);
  if (!url) return null;

  return {
    ...meta,
    path: path || meta?.path || "",
    url,
    displayName: fileName(meta),
    mimeType: meta?.mimeType || meta?.mimetype || "",
  };
};

// ✅ Resolve lesson id safely from any shape
const lessonIdOf = (l) =>
  String(l?._id || l?.lessonId || l?.chapterId || "");

/**
 * ✅ IMPORTANT:
 * Your backend can return lesson content in two possible shapes:
 *
 * SHAPE A (chapter-style inside course.chapters):
 *   chapter.materials
 *   chapter.taskFiles
 *   chapter.notes.files + chapter.notes.text
 *   chapter.caseStudy.file
 *   chapter.mcqs
 *
 * SHAPE B (Lesson model style):
 *   lesson.materials
 *   lesson.taskFiles
 *   lesson.notesFiles + lesson.notesText
 *   lesson.caseStudyFile
 *   lesson.mcqs
 *
 * We support both.
 */
const extractLessonContent = (activeLesson, course) => {
  // prefer activeLesson.lesson if present (lessonsWithProgress)
  const maybe = activeLesson?.lesson || activeLesson?.chapter || activeLesson || {};

  // sometimes backend gives lesson.chapter wrapper
  const wrapped = maybe?.chapter || maybe;

  // also try course.chapters by id (if exists)
  const chapters = Array.isArray(course?.chapters) ? course.chapters : [];
  const fromCourse =
    chapters.find((c) => String(c?._id) === String(activeLesson?._id)) || null;

  const pick = (a, b) => {
    const aKeys = a ? Object.keys(a).length : 0;
    const bKeys = b ? Object.keys(b).length : 0;
    return bKeys > aKeys ? b : a;
  };

  return pick(wrapped, fromCourse) || wrapped || fromCourse || {};
};

export default function StudentCourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(null);
  const [officeViewerError, setOfficeViewerError] = useState({});
  const [useGoogleViewer, setUseGoogleViewer] = useState({});
  const [fullScreenContent, setFullScreenContent] = useState(null);

  const [lessons, setLessons] = useState([]);
  const [activeLessonId, setActiveLessonId] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");

  const didFetchRef = useRef(false);
  
  // Sequential content viewing state
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showPostContentOptions, setShowPostContentOptions] = useState(false);
  const [selectedPostContent, setSelectedPostContent] = useState(null); // "caseStudy" or "mcq"
  const videoRef = useRef(null);
  const [lessonPdfPage, setLessonPdfPage] = useState(1);
  const [lessonPdfNumPages, setLessonPdfNumPages] = useState(null);

  const headers = useMemo(() => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchCourse = async () => {
    setErr("");
    let lastError = null;

    for (const prefix of API_PREFIXES) {
      try {
        const url = `${API_HOST}${prefix}/students/courses/${id}`;
        const res = await fetch(url, {
          headers: { Accept: "application/json", ...headers },
        });
        const data = await safeJson(res);

        if (res.ok && data?.course) {
          setCourse(data.course);
          setProgress(data.progress || null);

          const list = Array.isArray(data?.lessonsWithProgress)
            ? data.lessonsWithProgress
            : [];

          setLessons(list);

          // Don't auto-select first lesson - user must click
          // if (!activeLessonId && firstId) setActiveLessonId(String(firstId));

          return;
        }

        lastError = new Error(data?.message || `Request failed (${res.status})`);
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError || new Error("Failed to load course");
  };

  useEffect(() => {
    if (!id) return;
    if (didFetchRef.current) return;
    didFetchRef.current = true;

    (async () => {
      try {
        setLoading(true);
        await fetchCourse();
      } catch (e) {
        setErr(e?.message || "Could not load");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchCourse();
    } catch (e) {
      setErr(e?.message || "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  const activeLesson = useMemo(() => {
    return (
      lessons.find((l) => lessonIdOf(l) === String(activeLessonId)) || null
    );
  }, [lessons, activeLessonId]);

  const statusOf = (lessonId) => {
    const key = String(lessonId);

    const fromList =
      lessons.find((l) => lessonIdOf(l) === key) || null;

    const fromProgress =
      progress?.lessons?.find((x) => String(x.lessonId) === key) || null;

    return fromList?.status || fromProgress?.status || "locked";
  };

  const attemptsOf = (lessonId) => {
    const key = String(lessonId);
    const fromList =
      lessons.find((l) => lessonIdOf(l) === key) || null;
    return fromList?.attemptsUsed ?? 0;
  };

  const scoreOf = (lessonId) => {
    const key = String(lessonId);
    const fromList =
      lessons.find((l) => lessonIdOf(l) === key) || null;
    return fromList?.lastScorePercent ?? 0;
  };

  const activeId = activeLesson ? lessonIdOf(activeLesson) : "";

  const locked = activeLesson ? statusOf(activeId) === "locked" : true;
  const payReq = activeLesson ? statusOf(activeId) === "payment_required" : false;

  const content = useMemo(
    () => extractLessonContent(activeLesson, course),
    [activeLesson, course]
  );

  const materials = useMemo(
    () => (Array.isArray(content?.materials) ? content.materials : []),
    [content]
  );
  const taskFiles = useMemo(
    () => (Array.isArray(content?.taskFiles) ? content.taskFiles : []),
    [content]
  );

  const notesText =
    content?.notesText || content?.notes?.text || content?.notes?.note || "";

  const notesFiles = useMemo(() => {
    if (Array.isArray(content?.notesFiles)) return content.notesFiles;
    if (Array.isArray(content?.notes?.files)) return content.notes.files;
    return [];
  }, [content]);

  const mcqs = Array.isArray(content?.mcqs) ? content.mcqs : [];

  const caseFile =
    content?.caseStudyFile ||
    content?.caseStudy?.file ||
    content?.caseStudyFile?.file ||
    null;

  // Extract video
  const videoFile = useMemo(() => {
    const video = content?.video || content?.videoFile;
    if (!video) return null;
    return normalizeFileMeta(video);
  }, [content]);

  const caseStudyFile = useMemo(() => {
    if (!caseFile) return null;
    return normalizeFileMeta(caseFile);
  }, [caseFile]);

  const caseStudyQuestions = useMemo(() => {
    return Array.isArray(content?.caseStudy?.questions)
      ? content.caseStudy.questions
      : Array.isArray(content?.caseQuestions)
      ? content.caseQuestions
      : [];
  }, [content]);

  // Create a flat list of all files in order: video, materials, notes files, task files, case study
  const allFiles = useMemo(() => {
    const files = [];
    
    // Add video if exists
    if (videoFile) {
      files.push({ ...videoFile, type: "video", category: "Video" });
    }
    
    // Add materials
    materials.forEach((material, idx) => {
      const normalized = normalizeFileMeta(material);
      if (normalized) {
        files.push({ ...normalized, type: "materials", category: "Materials", originalIndex: idx });
      }
    });
    
    // Add notes files
    notesFiles.forEach((file, idx) => {
      const normalized = normalizeFileMeta(file);
      if (normalized) {
        files.push({ ...normalized, type: "notesFiles", category: "Notes Files", originalIndex: idx });
      }
    });
    
    // Add task files
    taskFiles.forEach((file, idx) => {
      const normalized = normalizeFileMeta(file);
      if (normalized) {
        files.push({ ...normalized, type: "taskFiles", category: "Task Files", originalIndex: idx });
      }
    });
    
    // Add case study file
    if (caseStudyFile) {
      files.push({ ...caseStudyFile, type: "caseStudy", category: "Case Study", originalIndex: 0 });
    }
    
    return files;
  }, [videoFile, materials, notesFiles, taskFiles, caseStudyFile]);

  // Get current content to display - MUST be defined before useEffects that use it
  const currentContent = useMemo(() => {
    if (allFiles.length === 0) return null;
    if (currentContentIndex >= allFiles.length) return allFiles[allFiles.length - 1];
    return allFiles[currentContentIndex];
  }, [allFiles, currentContentIndex]);

  // Reset content state when lesson changes
  useEffect(() => {
    if (!activeLessonId) return;
    
    setCurrentContentIndex(0);
    setIsCompleted(false);
    setShowPostContentOptions(false);
    setSelectedPostContent(null);
  }, [activeLessonId]);

  // Video completion tracking - only when current content is video
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentContent || currentContent.type !== "video") {
      setIsCompleted(false);
      return;
    }

    const handleTimeUpdate = () => {
      // Consider video complete if watched 90% or more
      if (video.duration && video.currentTime / video.duration >= 0.9) {
        setIsCompleted(true);
      }
    };

    const handleEnded = () => {
      setIsCompleted(true);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, [currentContent]);

  // Handle moving to next content item in sequential view
  const handleNextContent = () => {
    if (currentContentIndex < allFiles.length - 1) {
      setCurrentContentIndex(currentContentIndex + 1);
      setIsCompleted(false); // Reset completion for next item
      // Reset error states when navigating to new content
      if (currentContent?.url) {
        setOfficeViewerError(prev => {
          const newState = { ...prev };
          delete newState[currentContent.url];
          return newState;
        });
        setUseGoogleViewer(prev => {
          const newState = { ...prev };
          delete newState[currentContent.url];
          return newState;
        });
      }
    }
    // When on last file, buttons are shown directly in the UI (no need to set showPostContentOptions)
  };

  // Handle moving to previous content item
  const handlePreviousContent = () => {
    if (currentContentIndex > 0) {
      setCurrentContentIndex(currentContentIndex - 1);
      setIsCompleted(false);
      // Reset error states when navigating to new content
      if (currentContent?.url) {
        setOfficeViewerError(prev => {
          const newState = { ...prev };
          delete newState[currentContent.url];
          return newState;
        });
        setUseGoogleViewer(prev => {
          const newState = { ...prev };
          delete newState[currentContent.url];
          return newState;
        });
      }
    }
  };

  // Check if URL is publicly accessible (not localhost or private)
  const isPublicUrl = (url) => {
    if (!url) return false;
    const urlStr = String(url).toLowerCase();
    // Check for localhost patterns
    if (urlStr.includes('localhost') || 
        urlStr.includes('127.0.0.1') || 
        urlStr.includes('192.168.') || 
        urlStr.includes('10.0.') ||
        urlStr.includes('10.1.') ||
        urlStr.includes('172.16.') ||
        urlStr.includes('172.17.') ||
        urlStr.includes('172.18.') ||
        urlStr.includes('172.19.') ||
        urlStr.includes('172.20.') ||
        urlStr.includes('172.21.') ||
        urlStr.includes('172.22.') ||
        urlStr.includes('172.23.') ||
        urlStr.includes('172.24.') ||
        urlStr.includes('172.25.') ||
        urlStr.includes('172.26.') ||
        urlStr.includes('172.27.') ||
        urlStr.includes('172.28.') ||
        urlStr.includes('172.29.') ||
        urlStr.includes('172.30.') ||
        urlStr.includes('172.31.')) {
      return false;
    }
    // Must be a valid HTTP/HTTPS URL
    return urlStr.startsWith('http://') || urlStr.startsWith('https://');
  };

  // Reset error states when content changes
  useEffect(() => {
    if (currentContent?.url) {
      const fileType = guessFileType(currentContent);
      // For localhost/private URLs, immediately mark as error for Office docs
      if (fileType === "office" && !isPublicUrl(currentContent.url)) {
        // Immediately set error state for localhost files - don't even try viewer
        setOfficeViewerError(prev => ({ ...prev, [currentContent.url]: true }));
        setUseGoogleViewer(prev => {
          const newState = { ...prev };
          delete newState[currentContent.url];
          return newState;
        });
      } else if (fileType === "office") {
        // For public URLs, reset error states to try viewer
        setOfficeViewerError(prev => {
          const newState = { ...prev };
          delete newState[currentContent.url];
          return newState;
        });
        setUseGoogleViewer(prev => {
          const newState = { ...prev };
          delete newState[currentContent.url];
          return newState;
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when URL changes
  }, [currentContent?.url]);

  // Error detection for Office viewer with timeout
  const officeViewerTimeoutRef = useRef({});
  useEffect(() => {
    const timeoutRef = officeViewerTimeoutRef.current;
    if (currentContent?.url && guessFileType(currentContent) === "office" && !officeViewerError[currentContent.url]) {
      // Set timeout to detect if viewer fails
      timeoutRef[currentContent.url] = setTimeout(() => {
        // If viewer hasn't shown error after 5 seconds, check if it's actually working
        // For localhost, we already marked it as error, so this is for public URLs
        if (isPublicUrl(currentContent.url) && !officeViewerError[currentContent.url]) {
          // Try to detect iframe error
          const iframe = document.querySelector(`iframe[title="Office Document Viewer"]`);
          if (iframe) {
            try {
              // If we can't access contentWindow, might be CORS/error
              if (!iframe.contentWindow) {
                if (!useGoogleViewer[currentContent.url]) {
                  setUseGoogleViewer(prev => ({ ...prev, [currentContent.url]: true }));
                } else {
                  setOfficeViewerError(prev => ({ ...prev, [currentContent.url]: true }));
                }
              }
            } catch (e) {
              // CORS error - viewer likely failed
              if (!useGoogleViewer[currentContent.url]) {
                setUseGoogleViewer(prev => ({ ...prev, [currentContent.url]: true }));
              } else {
                setOfficeViewerError(prev => ({ ...prev, [currentContent.url]: true }));
              }
            }
          }
        }
      }, 5000);
    }
    
    return () => {
      if (currentContent?.url && timeoutRef[currentContent.url]) {
        clearTimeout(timeoutRef[currentContent.url]);
        delete timeoutRef[currentContent.url];
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps; ref captured above
  }, [currentContent?.url, officeViewerError, useGoogleViewer]);

  const startMCQTest = () => {
    if (!activeId) return;

    if (locked) {
      alert("This lesson is locked. Please complete previous lesson first.");
      return;
    }
    if (payReq) {
      alert("You reached maximum attempts. Please pay to unlock.");
      return;
    }

    navigate(`/student/courses/${id}/chapters/${activeId}/mcq`, {
      state: {
        courseId: id,
        lessonId: activeId,
        chapterId: activeId,
        courseTitle: course?.title || "",
        lessonTitle: content?.chapterName || content?.title || activeLesson?.title || "",
        chapterTitle: content?.chapterName || content?.title || activeLesson?.title || "",
        returnPath: `/student/course/${id}`, // Return to this page after MCQ
      },
    });
  };

  // Refresh course data when returning from MCQ (to unlock next lesson)
  useEffect(() => {
    const handleFocus = () => {
      // Refresh when window regains focus (user returns from MCQ page)
      if (id && !loading) {
        fetchCourse().catch(console.error);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run on mount; fetchCourse stable
  }, [id, loading]);

  const guessFileType = (file) => {
    if (!file?.url) return "download";
    const mime = String(file.mimeType || "").toLowerCase();
    if (mime.startsWith("image/")) return "image";
    if (mime === "application/pdf" || mime.includes("pdf")) return "pdf";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    if (
      mime.includes("wordprocessingml") ||
      mime.includes("msword") ||
      mime.includes("spreadsheetml") ||
      mime.includes("excel") ||
      mime.includes("officedocument") ||
      mime.includes("presentationml") ||
      mime.includes("powerpoint") ||
      mime.includes("opendocument")
    )
      return "office";
    if (
      mime.startsWith("text/") ||
      mime === "application/json" ||
      mime === "application/xml" ||
      mime === "application/csv"
    )
      return "text";

    const url = String(file.url).toLowerCase();
    const ext = url.split("?")[0].split(".").pop() || "";

    // Image formats - comprehensive list
    if (["png", "jpg", "jpeg", "jpe", "gif", "webp", "bmp", "svg", "ico", "tiff", "tif", "avif", "heic", "heif"].includes(ext)) return "image";
    
    // PDF
    if (ext === "pdf") return "pdf";
    
    // Video formats
    if (["mp4", "webm", "ogg", "ogv", "mov", "avi", "wmv", "flv", "mkv", "m4v", "3gp"].includes(ext)) return "video";
    
    // Audio formats
    if (["mp3", "wav", "ogg", "oga", "m4a", "aac", "flac", "wma"].includes(ext)) return "audio";
    
    // Office documents
    if (["pptx", "ppt", "docx", "doc", "xlsx", "xls", "odt", "ods", "odp"].includes(ext)) return "office";
    
    // Text files
    if (["txt", "csv", "json", "xml", "html", "htm", "css", "js", "md", "log"].includes(ext)) return "text";
    
    return "download";
  };

  useEffect(() => {
    setLessonPdfPage(1);
    setLessonPdfNumPages(null);
  }, [currentContent?.url, currentContentIndex]);

  const handleLessonNavNext = () => {
    const isPdf = currentContent && guessFileType(currentContent) === "pdf";
    if (isPdf && lessonPdfNumPages != null && lessonPdfPage < lessonPdfNumPages) {
      setLessonPdfPage((p) => p + 1);
      return;
    }
    handleNextContent();
  };

  const handleLessonNavPrev = () => {
    const isPdf = currentContent && guessFileType(currentContent) === "pdf";
    if (isPdf && lessonPdfPage > 1) {
      setLessonPdfPage((p) => p - 1);
      return;
    }
    handlePreviousContent();
  };

  const lessonNavPrevDisabled =
    currentContent && guessFileType(currentContent) === "pdf"
      ? lessonPdfPage <= 1 && currentContentIndex === 0
      : currentContentIndex === 0;

  // Get Office Online Viewer URL with fallback
  const getOfficeViewerUrl = (fileUrl, useGoogle = false) => {
    if (useGoogle) {
      // Google Docs Viewer as fallback
      return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    }
    // Microsoft Office Online Viewer (primary)
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
  };


  return (
    <>
      <StudentNavbar />

      <div className="scd-page scd-page--fill">
        <div className="scd-container">
          <div className="scd-topbar">
            <button className="scd-btn scd-btn-ghost" onClick={() => navigate(-1)}>
              ← Back
            </button>

            <button
              className="scd-btn scd-btn-ghost"
              onClick={onRefresh}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing…" : "⟳ Refresh"}
            </button>
          </div>

          <div className="scd-card">
            {loading ? (
              <div className="scd-loading">Loading course…</div>
            ) : err ? (
              <div className="scd-error">
                <div className="scd-error-title">Could not load</div>
                <div className="scd-error-msg">{err}</div>
              </div>
            ) : !course ? (
              <div className="scd-empty">Course not found.</div>
            ) : (
              <>
                <div className="scd-header">
                  <div className="scd-title-row">
                    <h1 className="scd-title">{course?.title}</h1>
                    {course?.category ? (
                      <span className="scd-pill scd-pill-blue">{course.category}</span>
                    ) : null}
                    {course?.duration ? (
                      <span className="scd-pill scd-pill-green">{course.duration}</span>
                    ) : null}
                  </div>

                  {course?.description ? (
                    <p className="scd-subtitle">{course.description}</p>
                  ) : null}
                </div>

                <div className="scd-body">
                  <aside className="scd-sidebar">
                    <div className="scd-side-title">Lessons</div>

                    {lessons.length === 0 ? (
                      <div className="scd-side-empty">No lessons uploaded yet.</div>
                    ) : (
                      <div className="scd-chapter-list">
                        {lessons.map((l, index) => {
                          const lid = lessonIdOf(l);
                          const st = statusOf(lid);
                          const isLocked = st === "locked";
                          const isPay = st === "payment_required";

                          return (
                            <button
                              key={lid || index}
                              type="button"
                              disabled={isLocked || isPay}
                              className={`scd-chapter-item ${
                                String(lid) === String(activeLessonId) ? "active" : ""
                              } ${isLocked ? "disabled" : ""}`}
                              onClick={() => {
                                if (!isLocked && !isPay) {
                                  // Set active lesson to show content in this page
                                  setActiveLessonId(String(lid));
                                }
                              }}
                              title={
                                isLocked
                                  ? "Locked until previous passed"
                                  : isPay
                                  ? "Payment required"
                                  : "Open Lesson"
                              }
                            >
                              <div className="scd-chapter-name">
                                {index + 1}. {l?.title || "Untitled Lesson"}
                              </div>
                              <div className="scd-chapter-meta">
                                <b style={{ textTransform: "capitalize" }}>
                                  {String(st).replaceAll("_", " ")}
                                </b>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </aside>

                  <main className="scd-content scd-content--lesson">
                    {!activeLesson ? (
                      <div className="scd-content-empty">Select a lesson to continue.</div>
                    ) : (
                      <>
                        <div className="scd-content-head">
                          <h2 className="scd-content-title">{activeLesson?.title || "Lesson"}</h2>

                          <div className="scd-muted" style={{ marginTop: 6 }}>
                            Status:{" "}
                            <b style={{ textTransform: "capitalize" }}>
                              {statusOf(activeId).replaceAll("_", " ")}
                            </b>
                            {" • "}Attempts: <b>{attemptsOf(activeId)}</b>
                            {" • "}Last Score: <b>{scoreOf(activeId)}%</b>
                          </div>

                          {payReq ? (
                            <div style={{ marginTop: 10 }}>
                              <button
                                type="button"
                                className="scd-btn scd-btn-ghost"
                                onClick={() =>
                                  alert("Payment flow should be triggered here for lesson unlock.")
                                }
                              >
                                Pay with Khalti to Unlock →
                              </button>
                            </div>
                          ) : null}
                        </div>

                        <div className="slv-content slv-content--fill scd-lesson-main">
                          {/* Sequential Content Display */}
                          {allFiles.length === 0 ? (
                            <div style={{ 
                              padding: "3rem", 
                              textAlign: "center",
                              color: "#64748b"
                            }}>
                              <h3 style={{ marginBottom: "1rem", color: "#0f172a" }}>
                                No content available
                              </h3>
                              <p>This lesson doesn't have any content uploaded yet.</p>
                            </div>
                          ) : currentContent && !showPostContentOptions ? (
                            <div className="scd-lesson-column">
                              <div className="scd-lesson-stage">
                              {/* Video Display */}
                              {currentContent.type === "video" && (
                                <div className="slv-video-section scd-video-stage" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                                  <h2 style={{ flexShrink: 0 }}>📹 Lesson Video</h2>
                                  <div className="slv-video-wrapper">
                                    <video
                                      ref={videoRef}
                                      src={currentContent.url}
                                      controls
                                      className="slv-video-player"
                                      onError={(e) => {
                                        console.error("Video error:", e);
                                        alert("Failed to load video. Please try again.");
                                      }}
                                    >
                                      Your browser does not support the video tag.
                                    </video>
                                  </div>
                                  <div style={{ marginTop: "12px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                                    {currentContent.displayName && (
                                      <a
                                        href={currentContent.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ 
                                          color: "#1976d2", 
                                          textDecoration: "none",
                                          fontSize: "0.875rem"
                                        }}
                                      >
                                        📥 Download: {currentContent.displayName}
                                      </a>
                                    )}
                                  </div>
                                  {isCompleted && (
                                    <div className="slv-completion-badge" style={{ marginTop: "1rem" }}>
                                      ✅ Video completed! Click "Next" to continue.
                                    </div>
                                  )}
                                  {currentContent.type === "video" && !isCompleted && (
                                    <div
                                      style={{
                                        marginTop: "1rem",
                                        padding: "12px",
                                        background: "#fff3cd",
                                        border: "1px solid #ffc107",
                                        borderRadius: "8px",
                                        textAlign: "center",
                                        fontSize: "0.875rem",
                                        color: "#856404",
                                      }}
                                    >
                                      💡 You can watch the video or click &quot;Next&quot; to skip to the next content.
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* File Display (Materials, Notes, Tasks, Case Study) — fills remaining height */}
                              {currentContent.type !== "video" && (
                                <div className="slv-materials-section" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                                  <div className="scd-lesson-toolbar">
                                    <h2 style={{ margin: 0 }}>
                                      {currentContent.type === "materials" && "📎 Lesson Materials"}
                                      {currentContent.type === "notesFiles" && "📝 Notes Files"}
                                      {currentContent.type === "taskFiles" && "✅ Task Files"}
                                      {currentContent.type === "caseStudy" && "📄 Case Study"}
                                    </h2>
                                    <button
                                      type="button"
                                      onClick={() => setFullScreenContent(currentContent)}
                                      style={{
                                        padding: "8px 16px",
                                        background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
                                        transition: "all 0.2s",
                                      }}
                                      onMouseEnter={(e) => {
                                        e.target.style.transform = "scale(1.05)";
                                        e.target.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.4)";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.target.style.transform = "scale(1)";
                                        e.target.style.boxShadow = "0 2px 8px rgba(59, 130, 246, 0.3)";
                                      }}
                                    >
                                      <i className="fa-solid fa-expand" style={{ fontSize: "12px" }}></i>
                                      Open Full Page
                                    </button>
                                  </div>
                                  <p className="scd-muted" style={{ margin: "0 0 8px", fontSize: 13 }}>
                                    {currentContentIndex + 1} of {allFiles.length}{" "}
                                    {currentContent.type === "materials"
                                      ? "Materials"
                                      : currentContent.type === "notesFiles"
                                      ? "Notes files"
                                      : currentContent.type === "taskFiles"
                                      ? "Tasks"
                                      : currentContent.type === "caseStudy"
                                      ? "Case study"
                                      : ""}
                                  </p>
                                  {guessFileType(currentContent) === "pdf" && (
                                    <div
                                      className="scd-viewer-surface"
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        minHeight: "min(78vh, 920px)",
                                      }}
                                    >
                                      <PDFViewer
                                        variant="embedded"
                                        hideBuiltInPageControls
                                        showZoom={false}
                                        url={currentContent.url}
                                        fileName={
                                          currentContent.displayName ||
                                          currentContent.name
                                        }
                                        page={lessonPdfPage}
                                        onPageChange={setLessonPdfPage}
                                        onNumPagesReady={setLessonPdfNumPages}
                                      />
                                    </div>
                                  )}
                                  {guessFileType(currentContent) === "image" && (
                                    <div className="scd-viewer-surface scd-viewer-surface--scroll" style={{ alignItems: "center", justifyContent: "center" }}>
                                      <img
                                        src={currentContent.url}
                                        alt="content"
                                        style={{
                                          maxWidth: "100%",
                                          maxHeight: "100%",
                                          objectFit: "contain",
                                          borderRadius: "8px",
                                        }}
                                        onError={(e) => {
                                          e.target.style.display = "none";
                                          const errorDiv = e.target.parentNode.querySelector(".image-error");
                                          if (errorDiv) {
                                            errorDiv.style.display = "block";
                                          }
                                        }}
                                      />
                                      <div className="image-error" style={{ display: "none", padding: "20px", color: "#dc2626" }}>
                                        <p>
                                          Failed to load image.{" "}
                                          <a href={currentContent.url} target="_blank" rel="noreferrer" download>
                                            Download instead
                                          </a>
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                  {guessFileType(currentContent) === "video" && (
                                    <div className="scd-viewer-surface" style={{ padding: 12 }}>
                                      <video controls src={currentContent.url} style={{ width: "100%", borderRadius: 12, maxHeight: "100%" }} />
                                    </div>
                                  )}
                                  {guessFileType(currentContent) === "office" && (
                                    <div
                                      className="scd-viewer-surface scd-viewer-surface--scroll"
                                      style={{
                                        padding: 0,
                                        display: "flex",
                                        flexDirection: "column",
                                        flex: 1,
                                        minHeight: 0,
                                      }}
                                    >
                                      {!isPublicUrl(currentContent.url) || officeViewerError[currentContent.url] ? (
                                        <div style={{ flex: 1, minHeight: 0, padding: 12, overflow: "auto" }}>
                                          <OfficeFileViewer
                                            fileUrl={currentContent.url}
                                            fileName={currentContent.displayName || currentContent.name}
                                          />
                                        </div>
                                      ) : (
                                        <iframe
                                          title="Office Document Viewer"
                                          src={getOfficeViewerUrl(currentContent.url, useGoogleViewer[currentContent.url])}
                                          allowFullScreen
                                          onError={() => {
                                            if (!useGoogleViewer[currentContent.url]) {
                                              setUseGoogleViewer((prev) => ({ ...prev, [currentContent.url]: true }));
                                            } else {
                                              setOfficeViewerError((prev) => ({ ...prev, [currentContent.url]: true }));
                                            }
                                          }}
                                        />
                                      )}
                                      <div style={{ flexShrink: 0, padding: "12px", textAlign: "center", borderTop: "1px solid #e2e8f0" }}>
                                        <a
                                          href={currentContent.url}
                                          download
                                          style={{
                                            display: "inline-block",
                                            padding: "10px 20px",
                                            background: "#6b7280",
                                            color: "white",
                                            textDecoration: "none",
                                            borderRadius: "6px",
                                            fontWeight: "600",
                                            fontSize: "14px",
                                          }}
                                        >
                                          📥 Download File
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                  {guessFileType(currentContent) === "audio" && (
                                    <div className="scd-viewer-surface scd-viewer-surface--scroll" style={{ justifyContent: "center", padding: 24 }}>
                                      <audio controls src={currentContent.url} style={{ width: "100%", maxWidth: "600px" }}>
                                        Your browser does not support the audio element.
                                      </audio>
                                      <div style={{ marginTop: "1rem", textAlign: "center" }}>
                                        <a
                                          className="slv-btn-view"
                                          href={currentContent.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          download
                                          style={{
                                            display: "inline-block",
                                            padding: "10px 20px",
                                            background: "#6b7280",
                                            color: "white",
                                            textDecoration: "none",
                                            borderRadius: "6px",
                                            fontWeight: "600",
                                          }}
                                        >
                                          Download Audio
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                  {guessFileType(currentContent) === "text" && (
                                    <div className="scd-viewer-surface">
                                      <iframe title="Text File Viewer" src={currentContent.url} />
                                      <div style={{ flexShrink: 0, padding: "12px", textAlign: "center", borderTop: "1px solid #e2e8f0" }}>
                                        <a
                                          className="slv-btn-view"
                                          href={currentContent.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          download
                                          style={{
                                            display: "inline-block",
                                            padding: "10px 20px",
                                            background: "#6b7280",
                                            color: "white",
                                            textDecoration: "none",
                                            borderRadius: "6px",
                                            fontWeight: "600",
                                          }}
                                        >
                                          Download File
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                  {guessFileType(currentContent) === "download" && (
                                    <div className="scd-viewer-surface scd-viewer-surface--scroll" style={{ justifyContent: "center", padding: 40 }}>
                                      <a
                                        className="slv-btn-view"
                                        href={currentContent.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                          display: "inline-block",
                                          padding: "12px 24px",
                                          background: "#3b82f6",
                                          color: "white",
                                          textDecoration: "none",
                                          borderRadius: "6px",
                                          fontWeight: "600",
                                        }}
                                      >
                                        Open / Download
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Notes Text Display */}
                              {notesText && currentContent.type === "notesFiles" && (
                                <div className="slv-notes" style={{ marginTop: "1rem", flexShrink: 0, maxHeight: "30%", overflow: "auto" }}>
                                  <h3>Notes</h3>
                                  <div className="slv-notes-text">{notesText}</div>
                                </div>
                              )}
                              </div>

                              {/* Navigation for Sequential Content */}
                              <div
                                className="scd-lesson-nav-bar"
                                style={{
                                  background: "white",
                                  boxShadow: "0 -2px 10px rgba(0,0,0,0.08)",
                                  borderRadius: "10px",
                                  overflow: "hidden",
                                }}
                              >
                              {currentContentIndex >= allFiles.length - 1 ? (
                                // On last file: Show Case Study/MCQ buttons directly
                                <div style={{
                                  marginTop: "2rem",
                                  padding: "2rem",
                                  background: "#f8faff",
                                  borderRadius: "12px",
                                  border: "2px solid #3b82f6",
                                  textAlign: "center"
                                }}>
                                  <h3 style={{ marginBottom: "1rem", color: "#0f172a" }}>
                                    ✅ All Files Completed!
                                  </h3>
                                  <p style={{ marginBottom: "1.5rem", color: "#64748b" }}>
                                    {caseStudyFile && mcqs.length > 0
                                      ? "Complete the case study and MCQ to unlock the next lesson."
                                      : caseStudyFile
                                      ? "Complete the case study to unlock the next lesson."
                                      : mcqs.length > 0
                                      ? "Complete the MCQ test to unlock the next lesson."
                                      : "All content completed!"}
                                  </p>
                                  <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                                    {caseStudyFile && (
                                      <button
                                        className="slv-btn-nav slv-btn-primary"
                                        onClick={() => setSelectedPostContent("caseStudy")}
                                        style={{
                                          padding: "12px 32px",
                                          fontSize: "16px",
                                          fontWeight: "600",
                                          minWidth: "200px"
                                        }}
                                      >
                                        📄 Continue with Case Study
                                      </button>
                                    )}
                                    {mcqs.length > 0 && (
                                      <button
                                        className="slv-btn-nav slv-btn-primary"
                                        onClick={() => {
                                          setSelectedPostContent("mcq");
                                          startMCQTest();
                                        }}
                                        style={{
                                          padding: "12px 32px",
                                          fontSize: "16px",
                                          fontWeight: "600",
                                          minWidth: "200px",
                                          background: caseStudyFile ? "linear-gradient(135deg, #8b5cf6, #6366f1)" : "linear-gradient(135deg, #3b82f6, #8b5cf6)"
                                        }}
                                      >
                                        ✅ Take MCQ Test {mcqs.length > 0 && `(${mcqs.length} questions)`}
                                      </button>
                                    )}
                                    {!caseStudyFile && mcqs.length === 0 && (
                                      <div style={{ color: "#64748b", padding: "1rem" }}>
                                        No case study or MCQ available for this lesson.
                                      </div>
                                    )}
                                  </div>
                                  {currentContentIndex > 0 && (
                                    <div style={{ marginTop: "1.5rem" }}>
                                      <button
                                        className="slv-btn-nav slv-btn-prev"
                                        onClick={handlePreviousContent}
                                        style={{
                                          padding: "8px 16px",
                                          fontSize: "14px"
                                        }}
                                      >
                                        ← Previous
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                // Not on last file: Show normal navigation
                                <div style={{ 
                                  marginTop: 0, 
                                  display: "flex", 
                                  justifyContent: "space-between", 
                                  alignItems: "center",
                                  padding: "1rem",
                                  background: "#f8faff",
                                  borderRadius: "8px",
                                  width: "100%",
                                  boxSizing: "border-box"
                                }}>
                                  <button
                                    className="slv-btn-nav slv-btn-prev"
                                    onClick={handleLessonNavPrev}
                                    disabled={lessonNavPrevDisabled}
                                    style={{
                                      opacity: lessonNavPrevDisabled ? 0.5 : 1,
                                      cursor: lessonNavPrevDisabled ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    ← Previous
                                  </button>
                                  
                                  <div style={{ color: "#64748b", fontSize: "0.95rem", textAlign: "center" }}>
                                    {currentContent &&
                                    guessFileType(currentContent) === "pdf" &&
                                    lessonPdfNumPages != null ? (
                                      <>
                                        <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                                          Page {lessonPdfPage} of {lessonPdfNumPages}
                                        </div>
                                        <div style={{ fontSize: "0.875rem" }}>
                                          Material {currentContentIndex + 1} of {allFiles.length} ·{" "}
                                          {currentContent.category}
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                                          {currentContentIndex + 1} of {allFiles.length}
                                        </div>
                                        <div style={{ fontSize: "0.875rem" }}>
                                          {currentContent.category}
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  <button
                                    className="slv-btn-nav slv-btn-primary"
                                    onClick={handleLessonNavNext}
                                    style={{ 
                                      cursor: "pointer"
                                    }}
                                  >
                                    Next →
                                  </button>
                                </div>
                              )}
                              </div>
                            </div>
                          ) : null}


                          {/* Case Study Display */}
                          {selectedPostContent === "caseStudy" && caseStudyFile && (
                            <div style={{ marginTop: "2rem" }}>
                              <div className="slv-materials-section">
                                <h2>📄 Case Study</h2>
                                <div style={{ marginTop: "1rem" }}>
                                  {guessFileType(caseStudyFile) === "office" && (
                                    <div style={{ width: "100%" }}>
                                      <iframe
                                        title="Case Study Viewer"
                                        src={getOfficeViewerUrl(caseStudyFile.url)}
                                        style={{ 
                                          width: "100%", 
                                          minHeight: "600px", 
                                          border: "1px solid #e5e7eb", 
                                          borderRadius: "8px",
                                          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                                        }}
                                        allowFullScreen
                                      />
                                      <div style={{ marginTop: "1rem", textAlign: "center" }}>
                                        <a
                                          className="slv-btn-view"
                                          href={caseStudyFile.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          download
                                          style={{ 
                                            display: "inline-block",
                                            padding: "10px 20px",
                                            background: "#6b7280",
                                            color: "white",
                                            textDecoration: "none",
                                            borderRadius: "6px",
                                            fontWeight: "600"
                                          }}
                                        >
                                          Download File
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                  {guessFileType(caseStudyFile) === "pdf" && (
                                    <div style={{ width: "100%" }}>
                                      <PDFViewer
                                        url={caseStudyFile.url}
                                        fileName={
                                          caseStudyFile.displayName ||
                                          caseStudyFile.name
                                        }
                                      />
                                    </div>
                                  )}
                                  {guessFileType(caseStudyFile) === "image" && (
                                    <img
                                      src={caseStudyFile.url}
                                      alt="Case Study"
                                      style={{ maxWidth: "100%", borderRadius: "8px" }}
                                    />
                                  )}
                                  {guessFileType(caseStudyFile) !== "office" && guessFileType(caseStudyFile) !== "pdf" && guessFileType(caseStudyFile) !== "image" && (
                                    <div className="slv-material-item">
                                      <div className="slv-material-info">
                                        <i className="fa-solid fa-file-pdf"></i>
                                        <span>{caseStudyFile.displayName || caseStudyFile.name}</span>
                                      </div>
                                      <a
                                        className="slv-btn-view"
                                        href={caseStudyFile.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ 
                                          display: "inline-block",
                                          padding: "8px 16px",
                                          background: "#3b82f6",
                                          color: "white",
                                          textDecoration: "none",
                                          borderRadius: "6px",
                                          fontWeight: "600"
                                        }}
                                      >
                                        Open / Download
                                      </a>
                                    </div>
                                  )}
                                </div>
                                {caseStudyQuestions.length > 0 && (
                                  <div className="slv-notes" style={{ marginTop: "1.5rem" }}>
                                    <h3>Case Study Questions</h3>
                                    <ol style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
                                      {caseStudyQuestions.map((q, idx) => (
                                        <li key={idx} style={{ marginBottom: "12px", color: "#334155" }}>
                                          {q}
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                )}
                                <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
                                  <div style={{ 
                                    marginBottom: "1rem", 
                                    padding: "12px", 
                                    background: "#e8f5e9", 
                                    borderRadius: "8px",
                                    color: "#2e7d32",
                                    fontSize: "0.875rem"
                                  }}>
                                    💡 Complete the MCQ test to unlock the next lesson.
                                  </div>
                                  <button
                                    className="slv-btn-nav slv-btn-primary"
                                    onClick={() => {
                                      setSelectedPostContent(null);
                                      startMCQTest();
                                    }}
                                    style={{
                                      padding: "12px 32px",
                                      fontSize: "16px",
                                      fontWeight: "600"
                                    }}
                                  >
                                    ✅ Proceed to MCQ Test →
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </main>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />

      {/* Full-Screen Material Viewer Modal */}
      {fullScreenContent && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            background: "#0f172a",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
              padding: "16px 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              flexShrink: 0
            }}
          >
            <h1 style={{ color: "white", fontSize: "18px", fontWeight: "600", margin: 0 }}>
              {fullScreenContent.displayName || fullScreenContent.name}
            </h1>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <a
                href={fullScreenContent.url}
                download
                style={{
                  padding: "8px 16px",
                  background: "#64748b",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "600",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "#475569";
                  e.target.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "#64748b";
                  e.target.style.transform = "scale(1)";
                }}
              >
                📥 Download
              </a>
              <button
                onClick={() => setFullScreenContent(null)}
                style={{
                  padding: "8px 16px",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "#2563eb";
                  e.target.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "#3b82f6";
                  e.target.style.transform = "scale(1)";
                }}
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              overflow: "auto",
              background: "#1e293b"
            }}
          >
            {guessFileType(fullScreenContent) === "pdf" && (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: "min(85vh, 900px)",
                  maxWidth: "1200px",
                  margin: "0 auto",
                }}
              >
                <PDFViewer
                  url={fullScreenContent.url}
                  fileName={
                    fullScreenContent.displayName || fullScreenContent.name
                  }
                />
              </div>
            )}
            {guessFileType(fullScreenContent) === "image" && (
              <img
                src={fullScreenContent.url}
                alt={fullScreenContent.displayName || fullScreenContent.name}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: "8px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
                }}
              />
            )}
            {guessFileType(fullScreenContent) === "video" && (
              <video
                src={fullScreenContent.url}
                controls
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  borderRadius: "8px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
                }}
              >
                Your browser does not support the video tag.
              </video>
            )}
            {guessFileType(fullScreenContent) === "office" && (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "white",
                  borderRadius: "8px",
                  padding: "20px",
                  overflow: "auto",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
                }}
              >
                <OfficeFileViewer
                  fileUrl={fullScreenContent.url}
                  fileName={fullScreenContent.displayName || fullScreenContent.name}
                />
              </div>
            )}
            {guessFileType(fullScreenContent) === "text" && (
              <iframe
                src={fullScreenContent.url}
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: "800px",
                  border: "none",
                  borderRadius: "8px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                  background: "white"
                }}
                title={fullScreenContent.displayName || fullScreenContent.name}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
