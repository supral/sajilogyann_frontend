// src/pages/teacher/EditLessonDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../../styles/EditLessonDetail.css";
import { useNavigate, useParams } from "react-router-dom";
import TeacherSidebar from "./TeacherSidebar";
import NavbarAfterLogin from "./NavbarAfterLogin";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_BASE_URL = `${API_HOST}/api`;

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

async function apiForm(path, { method = "POST", formData } = {}) {
  const token = getToken();
  if (!token) throw new Error("Token not found. Please login again.");

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  } catch {
    throw new Error("Failed to fetch: Backend not reachable.");
  }

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : null;

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

async function apiJson(path) {
  const token = getToken();
  if (!token) throw new Error("Token not found. Please login again.");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : null;

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export default function EditLessonDetail() {
  const navigate = useNavigate();
  const { id, chapterId } = useParams();

  const [activeTab, setActiveTab] = useState("course");

  const user = useMemo(() => {
    try {
      const raw =
        localStorage.getItem("bs_user") || sessionStorage.getItem("bs_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [chapterName, setChapterName] = useState("");
  const [description, setDescription] = useState("");
  const [notesText, setNotesText] = useState("");

  // optional add new files
  const [video, setVideo] = useState(null); // single video file (optional)
  const [materials, setMaterials] = useState([]);
  const [notesFiles, setNotesFiles] = useState([]);
  const [taskFiles, setTaskFiles] = useState([]);
  const [caseStudyFile, setCaseStudyFile] = useState(null);
  const [existingVideo, setExistingVideo] = useState(null); // existing video from server
  const [existingTaskFiles, setExistingTaskFiles] = useState([]); // existing task files
  const [existingNotesFiles, setExistingNotesFiles] = useState([]); // existing notes files
  const [filesToDelete, setFilesToDelete] = useState({ tasks: [], notes: [] }); // files marked for deletion

  const [mcqs, setMcqs] = useState([]); // editable full list
  const [caseQuestions, setCaseQuestions] = useState([]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiJson(`/teacher/courses/${id}/chapters/${chapterId}`);
      const ch = data?.chapter;

      setChapterName(ch?.chapterName || "");
      setDescription(ch?.description || "");
      setNotesText(ch?.notes?.text || "");
      setMcqs(Array.isArray(ch?.mcqs) ? ch.mcqs : []);
      setCaseQuestions(Array.isArray(ch?.caseStudy?.questions) ? ch.caseStudy.questions : []);
      setExistingVideo(ch?.video || null); // Store existing video info
      setExistingTaskFiles(Array.isArray(ch?.taskFiles) ? ch.taskFiles : []); // Store existing task files
      setExistingNotesFiles(Array.isArray(ch?.notes?.files) ? ch.notes.files : []); // Store existing notes files
      setFilesToDelete({ tasks: [], notes: [] }); // Reset deletions
    } catch (e) {
      setError(e.message || "Failed to load chapter");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, chapterId]);


  const updateMcq = (index, key, value) => {
    setMcqs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const updateMcqOption = (qIndex, optIndex, value) => {
    setMcqs((prev) => {
      const copy = [...prev];
      const opts = Array.isArray(copy[qIndex].options) ? [...copy[qIndex].options] : ["", "", "", ""];
      opts[optIndex] = value;
      copy[qIndex] = { ...copy[qIndex], options: opts };
      return copy;
    });
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!chapterName.trim() || !description.trim()) {
        throw new Error("Chapter name and description are required.");
      }
      if (!Array.isArray(mcqs) || mcqs.length < 10) {
        throw new Error("At least 10 MCQs are required.");
      }

      const fd = new FormData();
      fd.append("chapterName", chapterName.trim());
      fd.append("description", description.trim());
      fd.append("notesText", notesText || "");
      fd.append("mcqs", JSON.stringify(mcqs));
      fd.append("caseQuestions", JSON.stringify(caseQuestions));

      // append file deletions
      if (filesToDelete.tasks.length > 0) {
        fd.append("deleteTaskFiles", JSON.stringify(filesToDelete.tasks));
      }
      if (filesToDelete.notes.length > 0) {
        fd.append("deleteNotesFiles", JSON.stringify(filesToDelete.notes));
      }

      // append new files (optional)
      if (video) fd.append("video", video); // Video upload (optional - replaces existing if provided)
      materials.forEach((f) => fd.append("materials", f));
      notesFiles.forEach((f) => fd.append("notesFiles", f));
      taskFiles.forEach((f) => fd.append("taskFiles", f));
      if (caseStudyFile) fd.append("caseFile", caseStudyFile); // Fixed: should be "caseFile" not "caseStudyFile"

      await apiForm(`/teacher/courses/${id}/chapters/${chapterId}`, {
        method: "PUT",
        formData: fd,
      });

      alert("✅ Lesson updated successfully!");
      navigate(`/teacher/courses/${id}/chapters/${chapterId}`);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="teacher-dashboard-layout">
      <NavbarAfterLogin user={user} />

      <div className="teacher-body">
        <TeacherSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="teacher-content">
          <div className="edit-lesson-page">
            <div className="edit-topbar">
              <button className="back-btn" type="button" onClick={() => navigate(-1)}>
                ← Back
              </button>
              <h2>Edit Lesson</h2>
            </div>

            {loading ? (
              <p>Loading...</p>
            ) : (
              <form className="edit-form" onSubmit={save}>
                {error && <div className="edit-error">❌ {error}</div>}

                <label>Chapter Name</label>
                <input value={chapterName} onChange={(e) => setChapterName(e.target.value)} />

                <label>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} />

                <label>Notes Text</label>
                <textarea value={notesText} onChange={(e) => setNotesText(e.target.value)} />

                {/* Video Upload Section */}
                <div style={{ 
                  marginBottom: "20px", 
                  padding: "16px", 
                  background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)",
                  border: "2px solid rgba(59, 130, 246, 0.3)",
                  borderRadius: "8px"
                }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                    📹 Lesson Video (Optional)
                  </label>
                  <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "12px" }}>
                    {existingVideo 
                      ? `Current video: ${existingVideo.originalName || existingVideo.fileName || "Video"}`
                      : "No video uploaded. Upload a new video to add one."}
                  </p>
                  
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideo((e.target.files || [])[0] || null)}
                    style={{ marginBottom: "8px" }}
                  />

                  {video && (
                    <div style={{ 
                      marginTop: "12px",
                      padding: "12px",
                      background: "#fff",
                      borderRadius: "8px",
                      border: "1px solid #3b82f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}>
                      <div>
                        <i className="fa-solid fa-video" style={{ marginRight: "8px", color: "#3b82f6" }}></i>
                        <span>{video.name}</span>
                        <span style={{ marginLeft: "8px", color: "#666", fontSize: "0.875rem" }}>
                          ({(video.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setVideo(null)}
                        style={{
                          padding: "4px 8px",
                          background: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.875rem"
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {existingVideo && !video && (
                    <div style={{ 
                      marginTop: "12px",
                      padding: "12px",
                      background: "#e8f5e9",
                      borderRadius: "8px",
                      border: "1px solid #4caf50",
                      fontSize: "0.875rem",
                      color: "#2e7d32"
                    }}>
                      ℹ️ Current video will be kept. Upload a new video to replace it.
                    </div>
                  )}
                </div>

                <div className="file-row">
                  <div>
                    <label>Add Materials (optional)</label>
                    <input type="file" multiple onChange={(e) => setMaterials(Array.from(e.target.files || []))} />
                  </div>
                  <div>
                    <label>Add Notes Files (optional)</label>
                    <input type="file" multiple onChange={(e) => setNotesFiles(Array.from(e.target.files || []))} />
                  </div>
                </div>

                {/* Deleted Notes Files (with undo) */}
                {filesToDelete.notes.length > 0 && (
                  <div style={{ marginBottom: "20px", padding: "16px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
                    <label style={{ display: "block", marginBottom: "12px", fontWeight: "600", color: "#dc2626" }}>
                      🗑️ Notes Files Marked for Deletion
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {existingNotesFiles
                        .filter((f) => filesToDelete.notes.includes(f.path))
                        .map((file, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 12px",
                              background: "white",
                              borderRadius: "6px",
                              border: "1px solid #fecaca",
                              opacity: 0.7
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <i className="fa-solid fa-file" style={{ color: "#dc2626" }}></i>
                              <span style={{ textDecoration: "line-through" }}>
                                {file.originalName || file.fileName || "File"}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFilesToDelete((prev) => ({
                                  ...prev,
                                  notes: prev.notes.filter((p) => p !== file.path)
                                }));
                              }}
                              style={{
                                padding: "6px 12px",
                                background: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                                fontWeight: "500"
                              }}
                            >
                              <i className="fa-solid fa-undo" style={{ marginRight: "4px" }}></i>
                              Undo
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Existing Notes Files */}
                {existingNotesFiles.length > 0 && (
                  <div style={{ marginBottom: "20px", padding: "16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <label style={{ display: "block", marginBottom: "12px", fontWeight: "600" }}>
                      📝 Existing Notes Files
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {existingNotesFiles
                        .filter((f) => !filesToDelete.notes.includes(f.path))
                        .map((file, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 12px",
                              background: "white",
                              borderRadius: "6px",
                              border: "1px solid #e5e7eb"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <i className="fa-solid fa-file" style={{ color: "#64748b" }}></i>
                              <span>{file.originalName || file.fileName || "File"}</span>
                              {file.size && (
                                <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFilesToDelete((prev) => ({
                                  ...prev,
                                  notes: [...prev.notes, file.path]
                                }));
                              }}
                              style={{
                                padding: "6px 12px",
                                background: "#ef4444",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                                fontWeight: "500"
                              }}
                            >
                              <i className="fa-solid fa-trash" style={{ marginRight: "4px" }}></i>
                              Delete
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Deleted Task Files (with undo) */}
                {filesToDelete.tasks.length > 0 && (
                  <div style={{ marginBottom: "20px", padding: "16px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
                    <label style={{ display: "block", marginBottom: "12px", fontWeight: "600", color: "#dc2626" }}>
                      🗑️ Task Files Marked for Deletion
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {existingTaskFiles
                        .filter((f) => filesToDelete.tasks.includes(f.path))
                        .map((file, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 12px",
                              background: "white",
                              borderRadius: "6px",
                              border: "1px solid #fecaca",
                              opacity: 0.7
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <i className="fa-solid fa-file" style={{ color: "#dc2626" }}></i>
                              <span style={{ textDecoration: "line-through" }}>
                                {file.originalName || file.fileName || "File"}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFilesToDelete((prev) => ({
                                  ...prev,
                                  tasks: prev.tasks.filter((p) => p !== file.path)
                                }));
                              }}
                              style={{
                                padding: "6px 12px",
                                background: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                                fontWeight: "500"
                              }}
                            >
                              <i className="fa-solid fa-undo" style={{ marginRight: "4px" }}></i>
                              Undo
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Existing Task Files */}
                {existingTaskFiles.length > 0 && (
                  <div style={{ marginBottom: "20px", padding: "16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <label style={{ display: "block", marginBottom: "12px", fontWeight: "600" }}>
                      ✅ Existing Task Files
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {existingTaskFiles
                        .filter((f) => !filesToDelete.tasks.includes(f.path))
                        .map((file, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 12px",
                              background: "white",
                              borderRadius: "6px",
                              border: "1px solid #e5e7eb"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <i className="fa-solid fa-file" style={{ color: "#64748b" }}></i>
                              <span>{file.originalName || file.fileName || "File"}</span>
                              {file.size && (
                                <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFilesToDelete((prev) => ({
                                  ...prev,
                                  tasks: [...prev.tasks, file.path]
                                }));
                              }}
                              style={{
                                padding: "6px 12px",
                                background: "#ef4444",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                                fontWeight: "500"
                              }}
                            >
                              <i className="fa-solid fa-trash" style={{ marginRight: "4px" }}></i>
                              Delete
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="file-row">
                  <div>
                    <label>Add Task Files (optional)</label>
                    <input type="file" multiple onChange={(e) => setTaskFiles(Array.from(e.target.files || []))} />
                  </div>
                  <div>
                    <label>Replace Case Study File (optional)</label>
                    <input type="file" onChange={(e) => setCaseStudyFile(e.target.files?.[0] || null)} />
                  </div>
                </div>

                <div className="mcq-edit">
                  <h3>MCQs (min 10)</h3>
                  {mcqs.map((m, idx) => (
                    <div className="mcq-box" key={idx}>
                      <label>Question {idx + 1}</label>
                      <input
                        value={m.question || ""}
                        onChange={(e) => updateMcq(idx, "question", e.target.value)}
                      />

                      <div className="options-grid">
                        {[0, 1, 2, 3].map((o) => (
                          <input
                            key={o}
                            placeholder={`Option ${o + 1}`}
                            value={(m.options || [])[o] || ""}
                            onChange={(e) => updateMcqOption(idx, o, e.target.value)}
                          />
                        ))}
                      </div>

                      <label>Correct Answer</label>
                      <input
                        value={m.correct || ""}
                        onChange={(e) => updateMcq(idx, "correct", e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                <div className="case-edit">
                  <h3>Case Study Questions</h3>
                  {caseQuestions.map((q, i) => (
                    <input
                      key={i}
                      value={q}
                      onChange={(e) => {
                        const copy = [...caseQuestions];
                        copy[i] = e.target.value;
                        setCaseQuestions(copy);
                      }}
                      placeholder={`Question ${i + 1}`}
                    />
                  ))}
                  <button
                    type="button"
                    className="add-btn"
                    onClick={() => setCaseQuestions((p) => [...p, ""])}
                  >
                    + Add Question
                  </button>
                </div>

                <button className="save-btn" type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
