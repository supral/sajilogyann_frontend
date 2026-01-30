// bluesheep/src/pages/student/StudentLessonViewer.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import StudentNavbar from "./StudentNavbar";
import OfficeFileViewer from "../../components/OfficeFileViewer";
import "../../styles/StudentLessonViewer.css";
import "../../styles/dashboard.css";

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
    for (const path of paths) {
      const url = `${API_HOST}${prefix}${path}`;
      try {
        const res = await fetch(url, options);
        const data = await safeJson(res);
        if (res.ok) return { data, res };
        last = { data, url, res };
      } catch (e) {
        last = { error: e?.message || "Network error", url };
      }
    }
  }
  throw new Error(
    last?.data?.message || last?.error || `API error. Last: ${last?.url}`
  );
};

const normalizeFileMeta = (fileMeta) => {
  if (!fileMeta) return null;
  // Handle both object format {path, originalName, ...} and string path
  const path = typeof fileMeta === "string" 
    ? fileMeta 
    : fileMeta.path || fileMeta.url || "";
  if (!path) return null;
  const url = path.startsWith("http") ? path : `${API_HOST}${path}`;
  return {
    url,
    name: typeof fileMeta === "string" 
      ? "File" 
      : fileMeta.originalName || fileMeta.name || "File",
    type: typeof fileMeta === "string" 
      ? "" 
      : fileMeta.mimeType || fileMeta.type || "",
    size: typeof fileMeta === "string" 
      ? 0 
      : fileMeta.size || 0,
  };
};

export default function StudentLessonViewer() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Time tracking
  const [timeSpent, setTimeSpent] = useState(0); // in seconds
  const [isCompleted, setIsCompleted] = useState(false);
  const [readingStartTime, setReadingStartTime] = useState(null);
  const intervalRef = useRef(null);
  const videoRef = useRef(null);

  // File viewer state
  const [currentFileIndex, setCurrentFileIndex] = useState(null);
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);
  const [officeViewerError, setOfficeViewerError] = useState({});
  const [useGoogleViewer, setUseGoogleViewer] = useState({});
  
  // Sequential view: tracks which content to show in right side (0 = video, 1+ = other files)
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  
  // Track if all files are completed and what to show next
  const [showPostContentOptions, setShowPostContentOptions] = useState(false);
  const [selectedPostContent, setSelectedPostContent] = useState(null); // "caseStudy" or "mcq"

  // Current lesson index
  const currentIndex = useMemo(() => {
    return lessons.findIndex((l) => String(l._id || l.lessonId || l.id) === String(lessonId));
  }, [lessons, lessonId]);

  // Extract lesson content - handle different data shapes
  const lessonContent = useMemo(() => {
    if (!lesson) return {};
    // Try different possible structures - lesson.lesson contains the actual lesson data from backend
    const raw = lesson.lesson || lesson.chapter || lesson || {};
    // If raw is a mongoose document or has nested structure, extract properly
    return raw;
  }, [lesson]);

  const hasVideo = useMemo(() => {
    // Check if video exists in lesson content
    const video = lessonContent.video || lessonContent.videoFile;
    if (!video) return false;
    // If it's an object, check if it has a path
    if (typeof video === "object") {
      return !!(video.path || video.url);
    }
    // If it's a string, check if it's not empty
    return !!video;
  }, [lessonContent]);

  const videoFile = useMemo(() => {
    const video = lessonContent.video || lessonContent.videoFile;
    if (!video) return null;
    return normalizeFileMeta(video);
  }, [lessonContent]);

  const materials = useMemo(() => {
    return Array.isArray(lessonContent.materials) ? lessonContent.materials : [];
  }, [lessonContent]);

  const notesText = useMemo(() => {
    return lessonContent.notesText || lessonContent.notes?.text || lessonContent.notes?.note || "";
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

  const caseStudyFile = useMemo(() => {
    const caseFile = lessonContent.caseStudyFile || lessonContent.caseStudy?.file;
    if (!caseFile) return null;
    return normalizeFileMeta(caseFile);
  }, [lessonContent]);

  const mcqs = useMemo(() => {
    return Array.isArray(lessonContent.mcqs) ? lessonContent.mcqs : [];
  }, [lessonContent]);

  const caseStudyQuestions = useMemo(() => {
    return Array.isArray(lessonContent.caseStudy?.questions)
      ? lessonContent.caseStudy.questions
      : Array.isArray(lessonContent.caseQuestions)
      ? lessonContent.caseQuestions
      : [];
  }, [lessonContent]);

  // ✅ Define hasMaterials before it's used in useEffect
  const hasMaterials = useMemo(() => {
    return materials.length > 0 || notesText || notesFiles.length > 0 || taskFiles.length > 0;
  }, [materials, notesText, notesFiles, taskFiles]);

  // Create a flat list of all files in order: video, materials, notes files, task files, case study
  const allFiles = useMemo(() => {
    const files = [];
    
    // Add video if exists
    if (hasVideo && videoFile) {
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
  }, [hasVideo, videoFile, materials, notesFiles, taskFiles, caseStudyFile]);

  const currentFile = useMemo(() => {
    if (currentFileIndex === null || currentFileIndex < 0 || currentFileIndex >= allFiles.length) {
      return null;
    }
    return allFiles[currentFileIndex];
  }, [currentFileIndex, allFiles]);

  const canGoNext = useMemo(() => {
    return currentFileIndex !== null && currentFileIndex < allFiles.length - 1;
  }, [currentFileIndex, allFiles.length]);

  const canGoPrevious = useMemo(() => {
    return currentFileIndex !== null && currentFileIndex > 0;
  }, [currentFileIndex]);

  // Load course and lessons
  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      const { data } = await apiFetchCandidates([`/students/courses/${courseId}`], {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (data?.course) setCourse(data.course);
      if (Array.isArray(data?.lessonsWithProgress || data?.lessons)) {
        const lessonsList = data.lessonsWithProgress || data.lessons;
        setLessons(lessonsList);
        const found = lessonsList.find(
          (l) => String(l._id || l.lessonId || l.id) === String(lessonId)
        );
        if (found) setLesson(found);
      }
    } catch (e) {
      setError(e?.message || "Failed to load lesson");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId && lessonId) {
      loadData();
    }
  }, [courseId, lessonId]);

  // Refresh course data when returning from MCQ (to unlock next lesson)
  useEffect(() => {
    const handleFocus = () => {
      // Refresh when window regains focus (user returns from MCQ page)
      if (courseId && lessonId && !loading) {
        loadData().catch(console.error);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [courseId, lessonId, loading]);

  // Time tracking for reading materials
  useEffect(() => {
    if (!hasVideo && hasMaterials && !isCompleted) {
      // Start tracking reading time
      setReadingStartTime(Date.now());
      intervalRef.current = setInterval(() => {
        setTimeSpent((prev) => {
          const newTime = prev + 1;
          // Complete after 60 seconds (1 minute)
          if (newTime >= 60 && !isCompleted) {
            setIsCompleted(true);
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
          return newTime;
        });
      }, 1000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else if (hasVideo) {
      // Reset time tracking if video is present
      setTimeSpent(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [hasVideo, hasMaterials, isCompleted]);

  // Get current content to display - MUST be defined before useEffects that use it
  const currentContent = useMemo(() => {
    if (allFiles.length === 0) return null;
    if (currentContentIndex >= allFiles.length) return allFiles[allFiles.length - 1];
    return allFiles[currentContentIndex];
  }, [allFiles, currentContentIndex]);

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
  }, [currentContent?.url]);

  const handleNext = () => {
    if (currentIndex < lessons.length - 1) {
      const nextLesson = lessons[currentIndex + 1];
      const nextId = nextLesson._id || nextLesson.lessonId || nextLesson.id;
      navigate(`/student/courses/${courseId}/lessons/${nextId}`);
    } else {
      // Last lesson - navigate to quiz
      navigate(`/student/courses/${courseId}/chapters/${lessonId}/mcq`, {
        state: {
          courseId,
          lessonId,
          chapterId: lessonId,
          courseTitle: course?.title || "",
          lessonTitle: lesson?.title || lesson?.chapterName || "",
        },
      });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevLesson = lessons[currentIndex - 1];
      const prevId = prevLesson._id || prevLesson.lessonId || prevLesson.id;
      navigate(`/student/courses/${courseId}/lessons/${prevId}`);
    }
  };

  const openFile = (fileMeta, type = "materials", idx = 0) => {
    // Find the file in allFiles array
    const fileIndex = allFiles.findIndex(
      (f) => f.type === type && f.originalIndex === idx
    );
    
    if (fileIndex === -1) {
      alert("File not found");
      return;
    }
    
    setCurrentFileIndex(fileIndex);
    setIsFileViewerOpen(true);
  };

  const openFileByIndex = (index) => {
    if (index >= 0 && index < allFiles.length) {
      setCurrentFileIndex(index);
      setIsFileViewerOpen(true);
    }
  };

  const handleNextFile = () => {
    if (canGoNext) {
      setCurrentFileIndex(currentFileIndex + 1);
    }
  };

  const handlePreviousFile = () => {
    if (canGoPrevious) {
      setCurrentFileIndex(currentFileIndex - 1);
    }
  };

  const closeFileViewer = () => {
    setIsFileViewerOpen(false);
    setCurrentFileIndex(null);
  };

  const guessFileType = (file) => {
    if (!file?.url) return "download";
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

  // Get Office Online Viewer URL with fallback
  const getOfficeViewerUrl = (fileUrl, useGoogle = false) => {
    if (useGoogle) {
      // Google Docs Viewer as fallback
      return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    }
    // Microsoft Office Online Viewer (primary)
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
  };

  const startQuiz = () => {
    navigate(`/student/courses/${courseId}/chapters/${lessonId}/mcq`, {
      state: {
        courseId,
        lessonId,
        chapterId: lessonId,
        courseTitle: course?.title || "",
        lessonTitle: lesson?.title || lesson?.chapterName || "",
      },
    });
  };

  // Reset completion state when lesson changes - MUST be before early returns
  useEffect(() => {
    setIsCompleted(false);
    setTimeSpent(0);
    setIsFileViewerOpen(false);
    setCurrentFileIndex(null);
    setCurrentContentIndex(0); // Start with video (index 0)
    setShowPostContentOptions(false);
    setSelectedPostContent(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [lessonId]);

  // Handle ESC key to close file viewer - MUST be before early returns
  useEffect(() => {
    if (!isFileViewerOpen) return;
    
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        closeFileViewer();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFileViewerOpen]);

  // Early returns MUST come after all hooks
  if (loading) {
    return (
      <>
        <StudentNavbar />
        <div className="slv-container">
          <div className="slv-loading">Loading lesson...</div>
        </div>
      </>
    );
  }

  if (error || !lesson) {
    return (
      <>
        <StudentNavbar />
        <div className="slv-container">
          <div className="slv-error">
            <h3>Error</h3>
            <p>{error || "Lesson not found"}</p>
            <button onClick={() => navigate(-1)}>Go Back</button>
          </div>
        </div>
      </>
    );
  }

  const lessonTitle = lesson?.title || lesson?.chapterName || lessonContent?.chapterName || "Lesson";
  const isLastLesson = currentIndex === lessons.length - 1;

  const renderFileViewer = () => {
    if (!isFileViewerOpen || !currentFile) return null;

    const fileType = guessFileType(currentFile);

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.95)",
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "16px",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 10001,
          }}
        >
          <div style={{ color: "white", flex: 1 }}>
            <div style={{ fontSize: "14px", color: "#aaa", marginBottom: "4px" }}>
              {currentFile.category}
            </div>
            <div style={{ fontSize: "16px", fontWeight: "600" }}>
              {currentFile.name}
            </div>
            <div style={{ fontSize: "12px", color: "#aaa", marginTop: "4px" }}>
              File {currentFileIndex + 1} of {allFiles.length}
            </div>
          </div>
          <button
            onClick={closeFileViewer}
            style={{
              padding: "8px 16px",
              background: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* File Content */}
        <div
          style={{
            flex: 1,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 20px 100px",
            overflow: "auto",
          }}
        >
          {fileType === "image" ? (
            <img
              src={currentFile.url}
              alt={currentFile.name}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
              onError={(e) => {
                e.target.style.display = "none";
                const parent = e.target.parentNode;
                const errorDiv = document.createElement("div");
                errorDiv.style.cssText = "color: white; text-align: center; padding: 20px;";
                errorDiv.innerHTML = `
                  <p style="margin-bottom: 16px;">Failed to load image</p>
                  <a href="${currentFile.url}" target="_blank" rel="noreferrer" download 
                     style="padding: 12px 24px; background: #1976d2; color: white; text-decoration: none; border-radius: 4px; display: inline-block;">
                    Download Image
                  </a>
                `;
                parent.appendChild(errorDiv);
              }}
            />
          ) : fileType === "pdf" ? (
            <iframe
              src={currentFile.url}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                minHeight: "600px",
              }}
              title={currentFile.name}
            />
          ) : fileType === "video" ? (
            <video
              src={currentFile.url}
              controls
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            >
              Your browser does not support the video tag.
            </video>
          ) : fileType === "office" ? (
            !isPublicUrl(currentFile.url) || officeViewerError[currentFile.url] ? (
              // For localhost files or when viewer fails, use OfficeFileViewer component
              <div style={{ width: "100%", height: "100%", backgroundColor: "white", padding: "20px" }}>
                <OfficeFileViewer
                  fileUrl={currentFile.url}
                  fileName={currentFile.name}
                />
              </div>
            ) : (
              <iframe
                src={getOfficeViewerUrl(currentFile.url, useGoogleViewer[currentFile.url])}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  minHeight: "600px",
                  backgroundColor: "white",
                }}
                title={currentFile.name}
                allowFullScreen
                onError={() => {
                  if (!useGoogleViewer[currentFile.url]) {
                    setUseGoogleViewer(prev => ({ ...prev, [currentFile.url]: true }));
                  } else {
                    setOfficeViewerError(prev => ({ ...prev, [currentFile.url]: true }));
                  }
                }}
              />
            )
          ) : fileType === "audio" ? (
            <div style={{ color: "white", textAlign: "center", padding: "40px" }}>
              <audio
                controls
                src={currentFile.url}
                style={{ width: "100%", maxWidth: "600px", marginBottom: "20px" }}
              >
                Your browser does not support the audio element.
              </audio>
              <a
                href={currentFile.url}
                target="_blank"
                rel="noreferrer"
                download
                style={{
                  padding: "12px 24px",
                  background: "#1976d2",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "4px",
                  display: "inline-block",
                }}
              >
                📥 Download Audio
              </a>
            </div>
          ) : fileType === "text" ? (
            <iframe
              src={currentFile.url}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                minHeight: "600px",
                backgroundColor: "white",
                color: "black",
              }}
              title={currentFile.name}
            />
          ) : (
            <div style={{ color: "white", textAlign: "center" }}>
              <p style={{ fontSize: "18px", marginBottom: "16px" }}>
                {currentFile.name}
              </p>
              <a
                href={currentFile.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "12px 24px",
                  background: "#1976d2",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "4px",
                  display: "inline-block",
                }}
              >
                📥 Download File
              </a>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "20px",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 10001,
          }}
        >
          <button
            onClick={handlePreviousFile}
            disabled={!canGoPrevious}
            style={{
              padding: "12px 24px",
              background: canGoPrevious ? "#1976d2" : "#555",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: canGoPrevious ? "pointer" : "not-allowed",
              fontSize: "14px",
              opacity: canGoPrevious ? 1 : 0.5,
            }}
          >
            ← Previous
          </button>

          <div style={{ color: "white", fontSize: "14px" }}>
            {currentFileIndex + 1} / {allFiles.length}
          </div>

          <button
            onClick={handleNextFile}
            disabled={!canGoNext}
            style={{
              padding: "12px 24px",
              background: canGoNext ? "#1976d2" : "#555",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: canGoNext ? "pointer" : "not-allowed",
              fontSize: "14px",
              opacity: canGoNext ? 1 : 0.5,
            }}
          >
            Next →
          </button>
        </div>
      </div>
    );
  };

  // Helper function to get lesson status (simplified - you may need to adjust based on your data structure)
  const getLessonStatus = (lesson) => {
    // You can add logic here to determine if lesson is locked, completed, etc.
    return "available";
  };

  return (
    <>
      <StudentNavbar />
      {renderFileViewer()}
      <div className="scd-page">
        <div className="scd-container">
          <div className="scd-topbar">
            <button className="scd-btn scd-btn-ghost" onClick={() => navigate(-1)}>
              ← Back to Course
            </button>
            <h1 className="scd-title" style={{ margin: 0 }}>{course?.title || "Course"}</h1>
          </div>

          <div className="scd-card">
            <div className="scd-body">
              {/* Sidebar with Lessons List */}
              <aside className="scd-sidebar">
                <div className="scd-side-title">Lessons</div>
                {lessons.length === 0 ? (
                  <div className="scd-side-empty">No lessons available.</div>
                ) : (
                  <div className="scd-chapter-list">
                    {lessons.map((l, index) => {
                      const lid = String(l._id || l.lessonId || l.id);
                      const isActive = String(lessonId) === lid;
                      const status = getLessonStatus(l);

                      return (
                        <button
                          key={lid || index}
                          type="button"
                          className={`scd-chapter-item ${isActive ? "active" : ""}`}
                          onClick={() => {
                            navigate(`/student/courses/${courseId}/lessons/${lid}`);
                          }}
                        >
                          <div className="scd-chapter-name">
                            {index + 1}. {l?.title || l?.chapterName || "Untitled Lesson"}
                          </div>
                          <div className="scd-chapter-meta">
                            <b style={{ textTransform: "capitalize" }}>
                              {String(status).replaceAll("_", " ")}
                            </b>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </aside>

              {/* Right Content Area - Only show if lesson is selected */}
              <main className="scd-content">
                {!lessonId ? (
                  <div style={{ 
                    padding: "3rem", 
                    textAlign: "center",
                    color: "#64748b"
                  }}>
                    <h3 style={{ marginBottom: "1rem", color: "#0f172a" }}>
                      Select a lesson to begin
                    </h3>
                    <p>Click on a lesson from the left sidebar to view its content.</p>
                  </div>
                ) : (
                  <>
                    <div className="scd-content-head">
                      <h2 className="scd-content-title">{lessonTitle}</h2>
                      <div className="scd-muted" style={{ marginTop: 6 }}>
                        Lesson {currentIndex + 1} of {lessons.length}
                        {!hasVideo && materials.length > 0 && (
                          <span style={{ marginLeft: "12px" }}>
                            Reading time: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, "0")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="slv-content" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 250px)", minHeight: "500px", maxHeight: "calc(100vh - 200px)", position: "relative" }}>
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
                  ) : currentContent ? (
                    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
                      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: "120px", minHeight: 0 }}>
                      {/* Video Display */}
                      {currentContent.type === "video" && (
                        <div className="slv-video-section">
                          <h2>📹 Lesson Video</h2>
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
                            {currentContent.name && (
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
                                📥 Download: {currentContent.name}
                                {currentContent.size > 0 && ` (${(currentContent.size / 1024 / 1024).toFixed(2)} MB)`}
                              </a>
                            )}
                          </div>
                          {isCompleted && (
                            <div className="slv-completion-badge" style={{ marginTop: "1rem" }}>
                              ✅ Video completed! Click "Next" to continue.
                            </div>
                          )}
                        </div>
                      )}

                      {/* File Display (Materials, Notes, Tasks, Case Study) */}
                      {currentContent.type !== "video" && (
                        <div className="slv-materials-section">
                          <h2>
                            {currentContent.type === "materials" && "📎 Lesson Materials"}
                            {currentContent.type === "notesFiles" && "📝 Notes Files"}
                            {currentContent.type === "taskFiles" && "✅ Task Files"}
                            {currentContent.type === "caseStudy" && "📄 Case Study"}
                          </h2>
                          <div style={{ marginTop: "1rem" }}>
                            <div className="slv-material-item">
                              <div className="slv-material-info">
                                <i className="fa-solid fa-file"></i>
                                <span>{currentContent.name}</span>
                                {currentContent.size > 0 && (
                                  <span className="slv-file-size">
                                    ({(currentContent.size / 1024).toFixed(1)} KB)
                                  </span>
                                )}
                              </div>
                              <button
                                className="slv-btn-view"
                                onClick={() => {
                                  const fileIndex = allFiles.findIndex(
                                    (f) => f.type === currentContent.type && 
                                    (f.originalIndex === currentContent.originalIndex || f === currentContent)
                                  );
                                  if (fileIndex !== -1) {
                                    setCurrentFileIndex(fileIndex);
                                    setIsFileViewerOpen(true);
                                  }
                                }}
                              >
                                Open in Viewer
                              </button>
                            </div>
                          </div>
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
                                  startQuiz();
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
                            onClick={handlePreviousContent}
                            disabled={currentContentIndex === 0}
                            style={{ opacity: currentContentIndex === 0 ? 0.5 : 1, cursor: currentContentIndex === 0 ? "not-allowed" : "pointer" }}
                          >
                            ← Previous
                          </button>
                          
                          <div style={{ color: "#64748b", fontSize: "0.95rem", textAlign: "center" }}>
                            <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                              {currentContentIndex + 1} of {allFiles.length}
                            </div>
                            <div style={{ fontSize: "0.875rem" }}>
                              {currentContent.category}
                            </div>
                          </div>

                          <button
                            className="slv-btn-nav slv-btn-primary"
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
                  ) : null}


                  {/* Case Study Display */}
                  {selectedPostContent === "caseStudy" && caseStudyFile && (
                    <div style={{ marginTop: "2rem" }}>
                      <div className="slv-materials-section">
                        <h2>📄 Case Study</h2>
                        <div style={{ marginTop: "1rem" }}>
                          <div className="slv-material-item">
                            <div className="slv-material-info">
                              <i className="fa-solid fa-file-pdf"></i>
                              <span>{caseStudyFile.name}</span>
                            </div>
                            <button
                              className="slv-btn-view"
                              onClick={() => {
                                const fileIndex = allFiles.findIndex(f => f.type === "caseStudy");
                                if (fileIndex !== -1) {
                                  setCurrentFileIndex(fileIndex);
                                  setIsFileViewerOpen(true);
                                }
                              }}
                            >
                              Open in Viewer
                            </button>
                          </div>
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
                              startQuiz();
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
          </div>
        </div>
      </div>
    </>
  );
}
