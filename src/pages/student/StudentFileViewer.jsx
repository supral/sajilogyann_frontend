// src/pages/student/StudentFileViewer.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import StudentNavbar from "./StudentNavbar";
import Footer from "../../components/Footer";
import OfficeFileViewer from "../../components/OfficeFileViewer";
import PDFViewer from "../../components/PDFViewer";
import "../../styles/StudentFileViewer.css";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_PREFIXES = ["/api/v1", "/api"];

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const buildFileUrl = (p) => {
  if (!p) return "";
  const raw = String(p).trim();
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) return raw;

  const host = API_HOST.endsWith("/") ? API_HOST.slice(0, -1) : API_HOST;

  if (raw.startsWith("/uploads/")) return `${host}${raw}`;
  if (raw.startsWith("uploads/")) return `${host}/${raw}`;
  if (!raw.includes("/")) return `${host}/uploads/lessons/${raw}`;

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
    meta?.url ||
    meta?.fileUrl ||
    meta?.filename;

  const url = buildFileUrl(path);
  if (!url) return null;

  return { ...meta, path: path || meta?.path || "", url, displayName: fileName(meta) };
};

const getOfficeViewerUrl = (fileUrl) => {
  // Microsoft Office Online Viewer
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
};

const guessType = (file) => {
  const url = String(file?.url || "");
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() || "";
  
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

const extractLessonById = (data, courseId, chapterId) => {
  const course = data?.course || data;
  const chapters = Array.isArray(course?.chapters) ? course.chapters : [];
  const fromCourse = chapters.find((c) => String(c?._id) === String(chapterId)) || null;

  const list = Array.isArray(data?.lessonsWithProgress) ? data.lessonsWithProgress : [];
  const fromProgress = list.find((x) => String(x?._id) === String(chapterId)) || null;

  const content =
    fromProgress?.lesson?.chapter ||
    fromProgress?.lesson ||
    fromCourse ||
    null;

  return { course, content };
};

// Content types in sequence
const CONTENT_TYPES = {
  VIDEO: "video",
  NOTES: "notes",
  TASKS: "tasks",
  DOCUMENTS: "documents",
  MCQ: "mcq",
};

export default function StudentFileViewer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: courseId, chapterId } = useParams();

  const [lessons, setLessons] = useState([]);
  const [course, setCourse] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Sequential content flow state - using flat file list approach
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showPostContentOptions, setShowPostContentOptions] = useState(false);
  const [selectedPostContent, setSelectedPostContent] = useState(null); // "caseStudy" or "mcq"
  const [officeViewerError, setOfficeViewerError] = useState({});
  const [useGoogleViewer, setUseGoogleViewer] = useState({});
  
  const videoRef = useRef(null);

  const token = getToken();
  const authHeader = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  // Extract lesson content
  const lessonContent = useMemo(() => {
    if (!currentLesson) return {};
    const raw = currentLesson?.lesson?.chapter || currentLesson?.lesson || currentLesson || {};
    return raw;
  }, [currentLesson]);

  // Extract all content items
  const videoFile = useMemo(() => {
    const video = lessonContent.video || lessonContent.videoFile;
    if (!video) return null;
    return normalizeFileMeta(video);
  }, [lessonContent]);

  const notesFiles = useMemo(() => {
    return Array.isArray(lessonContent.notesFiles)
      ? lessonContent.notesFiles
      : Array.isArray(lessonContent.notes?.files)
      ? lessonContent.notes.files
      : [];
  }, [lessonContent]);

  const taskFiles = useMemo(() => {
    return Array.isArray(lessonContent.taskFiles) ? lessonContent.taskFiles : [];
  }, [lessonContent]);

  const materials = useMemo(() => {
    return Array.isArray(lessonContent.materials) ? lessonContent.materials : [];
  }, [lessonContent]);

  const caseStudyFile = useMemo(() => {
    const caseFile = lessonContent.caseStudyFile || lessonContent.caseStudy?.file;
    if (!caseFile) return null;
    return normalizeFileMeta(caseFile);
  }, [lessonContent]);

  const caseStudyQuestions = useMemo(() => {
    return Array.isArray(lessonContent.caseStudy?.questions)
      ? lessonContent.caseStudy.questions
      : Array.isArray(lessonContent.caseQuestions)
      ? lessonContent.caseQuestions
      : [];
  }, [lessonContent]);

  const mcqs = useMemo(() => {
    return Array.isArray(lessonContent.mcqs) ? lessonContent.mcqs : [];
  }, [lessonContent]);

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

  // Load course and lessons
  const loadCourse = async () => {
    if (!courseId) return;

    setLoading(true);
    try {
      for (const prefix of API_PREFIXES) {
        const res = await fetch(`${API_HOST}${prefix}/students/courses/${courseId}`, {
          headers: { Accept: "application/json", ...authHeader },
        });
        const data = await safeJson(res);

        if (res.ok && data?.course) {
          setCourse(data.course);
          setCourseTitle(data.course?.title || "");

          const lessonsList = Array.isArray(data?.lessonsWithProgress)
            ? data.lessonsWithProgress
            : [];
          setLessons(lessonsList);

          // Only set current lesson if chapterId is provided (from URL params)
          // Don't auto-select - wait for user to click
          const lessonId = chapterId || location.state?.chapterId;
          if (lessonId) {
            const found = lessonsList.find(
              (l) => String(l?._id) === String(lessonId)
            );
            if (found) {
              setCurrentLesson(found);
            }
          }
          // Don't auto-select first lesson - user must click

          break;
        }
      }
    } catch (error) {
      console.error("Failed to load course:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, chapterId]);

  // Refresh course data when returning from MCQ (to unlock next lesson)
  useEffect(() => {
    const handleFocus = () => {
      // Refresh when window regains focus (user returns from MCQ page)
      if (courseId && !loading) {
        loadCourse().catch(console.error);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [courseId, loading]);

  // Reset content state when lesson changes
  useEffect(() => {
    if (!currentLesson) return;
    
    setCurrentContentIndex(0);
    setIsCompleted(false);
    setShowPostContentOptions(false);
    setSelectedPostContent(null);
  }, [currentLesson?._id]);

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

  // Check if URL is publicly accessible (not localhost or private)
  const isPublicUrl = (url) => {
    if (!url) return false;
    const urlStr = String(url).toLowerCase();
    return !urlStr.includes('localhost') && 
           !urlStr.includes('127.0.0.1') && 
           !urlStr.includes('192.168.') && 
           !urlStr.includes('10.') &&
           (urlStr.startsWith('http://') || urlStr.startsWith('https://'));
  };

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

  // Reset error states when content changes
  useEffect(() => {
    if (currentContent?.url) {
      const fileType = guessType(currentContent);
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
  }, [currentContent?.url]);

  // Handle lesson selection
  const handleLessonSelect = (lesson) => {
    setCurrentLesson(lesson);
    // Content type will be auto-set by useEffect based on available content
  };

  // Start MCQ
  const startMCQ = () => {
    if (!currentLesson) return;
    
    const lessonId = currentLesson._id || currentLesson.lessonId || currentLesson.id;
    navigate(`/student/courses/${courseId}/chapters/${lessonId}/mcq`, {
      state: {
        courseId,
        lessonId,
        chapterId: lessonId,
        courseTitle,
        lessonTitle: currentLesson?.title || currentLesson?.chapterName || "",
        chapterTitle: currentLesson?.title || currentLesson?.chapterName || "",
      },
    });
  };

  if (loading) {
    return (
      <>
        <StudentNavbar />
        <div className="sfv-page">
          <div className="sfv-card">
            <h2>Loading...</h2>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const lessonTitle = currentLesson?.title || currentLesson?.chapterName || "Lesson";
  const currentLessonId = String(currentLesson?._id || "");

  return (
    <>
      <StudentNavbar />

      <div className="sfv-page" style={{ display: "flex", gap: "20px", padding: "20px" }}>
        {/* Left Sidebar - Lessons List */}
        <div style={{ 
          width: "300px", 
          minWidth: "300px",
          backgroundColor: "#f5f5f5",
          borderRadius: "8px",
          padding: "20px",
          height: "fit-content",
          maxHeight: "calc(100vh - 120px)",
          overflowY: "auto"
        }}>
          <h3 style={{ marginTop: 0, marginBottom: "15px", fontSize: "18px", fontWeight: "600" }}>
            Lessons
          </h3>
          {lessons.length === 0 ? (
            <p style={{ color: "#666" }}>No lessons available</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {lessons.map((lesson, index) => {
                const lessonId = String(lesson?._id || "");
                const isActive = lessonId === currentLessonId;
                const isLocked = lesson?.status === "locked";
                
                return (
                  <button
                    key={lessonId || index}
                    onClick={() => !isLocked && handleLessonSelect(lesson)}
                    disabled={isLocked}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      border: "none",
                      borderRadius: "6px",
                      backgroundColor: isActive ? "#2196f3" : isLocked ? "#e0e0e0" : "#fff",
                      color: isActive ? "#fff" : isLocked ? "#999" : "#333",
                      cursor: isLocked ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      fontWeight: isActive ? "600" : "400",
                      boxShadow: isActive ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isLocked && !isActive) {
                        e.currentTarget.style.backgroundColor = "#f0f0f0";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLocked && !isActive) {
                        e.currentTarget.style.backgroundColor = "#fff";
                      }
                    }}
                  >
                    <div style={{ fontSize: "14px" }}>
                      {index + 1}. {lesson?.title || `Lesson ${index + 1}`}
                    </div>
                    {isLocked && (
                      <div style={{ fontSize: "12px", marginTop: "4px", opacity: 0.8 }}>
                        Locked
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side - Content Viewer - Only show if lesson is selected */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {!currentLesson ? (
            <div className="sfv-card" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ padding: "40px", textAlign: "center" }}>
                <h3 style={{ marginBottom: "1rem", color: "#0f172a" }}>
                  Select a lesson to begin
                </h3>
                <p style={{ color: "#64748b" }}>Click on a lesson from the left sidebar to view its content.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="sfv-top" style={{ marginBottom: "20px" }}>
                <button className="sfv-btn" onClick={() => navigate(-1)}>
                  ← Back
                </button>
                <div className="sfv-meta">
                  <div className="sfv-course">{courseTitle}</div>
                  <div className="sfv-chapter">{lessonTitle}</div>
                </div>
              </div>

              <div className="sfv-card" style={{ flex: 1, display: "flex", flexDirection: "column", height: "calc(100vh - 250px)", minHeight: "500px", maxHeight: "calc(100vh - 200px)", position: "relative" }}>
                {/* Sequential Content Display */}
                {allFiles.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center" }}>
                    <h3 style={{ marginBottom: "1rem", color: "#0f172a" }}>
                      No content available
                    </h3>
                    <p style={{ color: "#64748b" }}>This lesson doesn't have any content uploaded yet.</p>
                  </div>
                ) : currentContent && !showPostContentOptions ? (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
                    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: "120px", minHeight: 0, scrollbarWidth: "thin" }}>
                    {/* Video Display */}
                    {currentContent.type === "video" && (
                      <div style={{ marginBottom: "20px" }}>
                        <h3 style={{ marginBottom: "15px" }}>📹 Lesson Video</h3>
                        <video
                          ref={videoRef}
                          controls
                          src={currentContent.url}
                          style={{ width: "100%", borderRadius: 12, maxHeight: "600px" }}
                        />
                        {isCompleted && (
                          <div style={{ 
                            marginTop: "10px", 
                            padding: "10px", 
                            backgroundColor: "#e8f5e9", 
                            borderRadius: "6px",
                            color: "#2e7d32"
                          }}>
                            ✅ Video completed! Click "Next" to continue.
                          </div>
                        )}
                      </div>
                    )}

                    {/* File Display (Materials, Notes, Tasks, Case Study) */}
                    {currentContent.type !== "video" && (
                      <div style={{ flex: 1, marginBottom: "20px" }}>
                        <h3 style={{ marginBottom: "15px" }}>
                          {currentContent.type === "materials" && "📎 Lesson Materials"}
                          {currentContent.type === "notesFiles" && "📝 Notes Files"}
                          {currentContent.type === "taskFiles" && "✅ Task Files"}
                          {currentContent.type === "caseStudy" && "📄 Case Study"}
                        </h3>
                        
                        {guessType(currentContent) === "pdf" && (
                          <PDFViewer 
                            url={currentContent.url} 
                            fileName={currentContent.displayName || currentContent.name}
                          />
                        )}
                        {guessType(currentContent) === "image" && (
                          <div style={{ width: "100%", textAlign: "center", maxHeight: "calc(100vh - 400px)", overflow: "auto" }}>
                            <img
                              src={currentContent.url}
                              className="sfv-image"
                              alt="content"
                              style={{ 
                                maxWidth: "100%", 
                                maxHeight: "calc(100vh - 400px)",
                                borderRadius: "8px",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
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
                              <p>Failed to load image. <a href={currentContent.url} target="_blank" rel="noreferrer" download>Download instead</a></p>
                            </div>
                          </div>
                        )}
                        {guessType(currentContent) === "video" && (
                          <video
                            controls
                            src={currentContent.url}
                            style={{ width: "100%", borderRadius: 12, maxHeight: "calc(100vh - 400px)" }}
                          />
                        )}
                        {guessType(currentContent) === "office" && (
                          <div style={{ width: "100%", marginTop: "1rem" }}>
                            {!isPublicUrl(currentContent.url) || officeViewerError[currentContent.url] ? (
                              // For localhost files or when viewer fails, use OfficeFileViewer component
                              <OfficeFileViewer
                                fileUrl={currentContent.url}
                                fileName={currentContent.displayName || currentContent.name}
                              />
                            ) : (
                              <iframe
                                title="Office Document Viewer"
                                src={getOfficeViewerUrl(currentContent.url, useGoogleViewer[currentContent.url])}
                                style={{ 
                                  width: "100%", 
                                  height: "600px",
                                  maxHeight: "calc(100vh - 400px)", 
                                  border: "1px solid #e5e7eb", 
                                  borderRadius: "8px",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                                }}
                                allowFullScreen
                                onError={() => {
                                  if (!useGoogleViewer[currentContent.url]) {
                                    setUseGoogleViewer(prev => ({ ...prev, [currentContent.url]: true }));
                                  } else {
                                    setOfficeViewerError(prev => ({ ...prev, [currentContent.url]: true }));
                                  }
                                }}
                              />
                            )}
                            {/* Download option always available */}
                            <div style={{ marginTop: "1rem", textAlign: "center" }}>
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
                                  fontSize: "14px"
                                }}
                              >
                                📥 Download File
                              </a>
                            </div>
                          </div>
                        )}
                        {guessType(currentContent) === "audio" && (
                          <div style={{ width: "100%", marginTop: "1rem", textAlign: "center" }}>
                            <audio
                              controls
                              src={currentContent.url}
                              style={{ width: "100%", maxWidth: "600px" }}
                            >
                              Your browser does not support the audio element.
                            </audio>
                            <div style={{ marginTop: "1rem" }}>
                              <a
                                className="sfv-btn sfv-btn-primary"
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
                                  fontWeight: "600"
                                }}
                              >
                                Download Audio
                              </a>
                            </div>
                          </div>
                        )}
                        {guessType(currentContent) === "text" && (
                          <div style={{ width: "100%", marginTop: "1rem", maxHeight: "calc(100vh - 400px)", overflow: "auto" }}>
                            <iframe
                              title="Text File Viewer"
                              src={currentContent.url}
                              style={{ 
                                width: "100%", 
                                height: "500px",
                                maxHeight: "calc(100vh - 400px)", 
                                border: "1px solid #e5e7eb", 
                                borderRadius: "8px",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                              }}
                            />
                            <div style={{ marginTop: "1rem", textAlign: "center" }}>
                              <a
                                className="sfv-btn sfv-btn-primary"
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
                                  fontWeight: "600"
                                }}
                              >
                                Download File
                              </a>
                            </div>
                          </div>
                        )}
                        {guessType(currentContent) === "download" && (
                          <div style={{ textAlign: "center", padding: "40px" }}>
                            <a
                              className="sfv-btn sfv-btn-primary"
                              href={currentContent.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open / Download
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Show message if video not completed but user can still proceed */}
                    {currentContent.type === "video" && !isCompleted && (
                      <div style={{ 
                        marginTop: "1rem", 
                        padding: "12px", 
                        background: "#fff3cd", 
                        border: "1px solid #ffc107",
                        borderRadius: "8px",
                        textAlign: "center",
                        fontSize: "0.875rem",
                        color: "#856404"
                      }}>
                        💡 You can watch the video or click "Next" to skip to the next content.
                      </div>
                    )}
                    </div>

                    {/* Navigation for Sequential Content */}
                    <div style={{ 
                      position: "absolute", 
                      bottom: 0, 
                      left: 0, 
                      right: 0, 
                      background: "white", 
                      zIndex: 100, 
                      paddingTop: "1rem",
                      paddingBottom: "1rem",
                      boxShadow: "0 -2px 10px rgba(0,0,0,0.1)"
                    }}>
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
                              className="sfv-btn sfv-btn-primary"
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
                              className="sfv-btn sfv-btn-primary"
                              onClick={() => {
                                setSelectedPostContent("mcq");
                                startMCQ();
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
                              className="sfv-btn sfv-btn-prev"
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
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        paddingTop: "20px",
                        borderTop: "1px solid #e0e0e0",
                        width: "100%",
                        boxSizing: "border-box"
                      }}>
                        <button
                          className="sfv-btn"
                          onClick={handlePreviousContent}
                          disabled={currentContentIndex === 0}
                          style={{ opacity: currentContentIndex === 0 ? 0.5 : 1, cursor: currentContentIndex === 0 ? "not-allowed" : "pointer" }}
                        >
                          ← Previous
                        </button>
                        
                        <div style={{ textAlign: "center", color: "#64748b", fontSize: "0.95rem" }}>
                          <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                            {currentContentIndex + 1} of {allFiles.length}
                          </div>
                          <div style={{ fontSize: "0.875rem" }}>
                            {currentContent.category}
                          </div>
                        </div>

                        <button
                          className="sfv-btn sfv-btn-primary"
                          onClick={handleNextContent}
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
                    <div style={{ marginBottom: "1.5rem" }}>
                      <h3 style={{ marginBottom: "15px" }}>📄 Case Study</h3>
                      {guessType(caseStudyFile) === "office" && (
                        <div style={{ width: "100%" }}>
                          {!isPublicUrl(caseStudyFile.url) || officeViewerError[caseStudyFile.url] ? (
                            // For localhost files or when viewer fails, use OfficeFileViewer component
                            <OfficeFileViewer
                              fileUrl={caseStudyFile.url}
                              fileName={caseStudyFile.displayName || caseStudyFile.name}
                            />
                          ) : (
                            <iframe
                              title="Case Study Viewer"
                              src={getOfficeViewerUrl(caseStudyFile.url, useGoogleViewer[caseStudyFile.url])}
                              style={{ 
                                width: "100%", 
                                minHeight: "600px", 
                                border: "1px solid #e5e7eb", 
                                borderRadius: "8px",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                              }}
                              allowFullScreen
                              onError={() => {
                                if (!useGoogleViewer[caseStudyFile.url]) {
                                  setUseGoogleViewer(prev => ({ ...prev, [caseStudyFile.url]: true }));
                                } else {
                                  setOfficeViewerError(prev => ({ ...prev, [caseStudyFile.url]: true }));
                                }
                              }}
                            />
                          )}
                          {/* Download option always available */}
                          <div style={{ marginTop: "1rem", textAlign: "center" }}>
                            <a
                              href={caseStudyFile.url}
                              download
                              style={{ 
                                display: "inline-block",
                                padding: "10px 20px",
                                background: "#6b7280",
                                color: "white",
                                textDecoration: "none",
                                borderRadius: "6px",
                                fontWeight: "600",
                                fontSize: "14px"
                              }}
                            >
                              📥 Download File
                            </a>
                          </div>
                        </div>
                      )}
                      {guessType(caseStudyFile) === "pdf" && (
                        <PDFViewer 
                          url={caseStudyFile.url} 
                          fileName={caseStudyFile.displayName || caseStudyFile.name || "Case Study"}
                        />
                      )}
                      {guessType(caseStudyFile) === "image" && (
                        <img
                          src={caseStudyFile.url}
                          alt="Case Study"
                          style={{ maxWidth: "100%", borderRadius: "8px" }}
                        />
                      )}
                      {guessType(caseStudyFile) !== "office" && guessType(caseStudyFile) !== "pdf" && guessType(caseStudyFile) !== "image" && (
                        <div style={{ 
                          padding: "16px", 
                          background: "#f8faff", 
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <i className="fa-solid fa-file-pdf" style={{ fontSize: "1.5rem", color: "#3b82f6" }}></i>
                            <span style={{ fontWeight: "600" }}>{caseStudyFile.displayName || caseStudyFile.name}</span>
                          </div>
                          <a
                            className="sfv-btn sfv-btn-primary"
                            href={caseStudyFile.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ padding: "8px 16px" }}
                          >
                            Open / Download
                          </a>
                        </div>
                      )}
                    </div>
                    {caseStudyQuestions.length > 0 && (
                      <div style={{ 
                        marginTop: "1.5rem",
                        padding: "1.5rem",
                        background: "#fff",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb"
                      }}>
                        <h3 style={{ marginBottom: "1rem" }}>Case Study Questions</h3>
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
                        className="sfv-btn sfv-btn-primary"
                        onClick={() => {
                          setSelectedPostContent(null);
                          startMCQ();
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
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
