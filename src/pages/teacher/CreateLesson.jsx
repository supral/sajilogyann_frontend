import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TeacherSidebar from "./TeacherSidebar";
import NavbarAfterLogin from "./NavbarAfterLogin";
import "../../styles/CreateLesson.css";

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const API_BASE_URL = `${API_HOST}/api`;

const getToken = () =>
  localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

async function apiForm(path, { method = "POST", formData }) {
  const token = getToken();
  if (!token) throw new Error("Token not found. Please login again.");

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
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

const makeEmptyMcq = () => ({
  question: "",
  options: ["", "", "", ""],
  correct: "",
});

const CreateLesson = () => {
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

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // chapter info
  const [chapterName, setChapterName] = useState("");
  const [description, setDescription] = useState("");

  // files
  const [video, setVideo] = useState(null); // single video file (optional)
  const [materials, setMaterials] = useState([]); // multiple
  const [notesText, setNotesText] = useState("");
  const [notesFiles, setNotesFiles] = useState([]); // multiple
  const [taskFiles, setTaskFiles] = useState([]); // multiple

  // MCQ (minimum 10 required)
  const [mcqs, setMcqs] = useState(() => Array.from({ length: 10 }, () => makeEmptyMcq()));

  // case study
  const [caseFile, setCaseFile] = useState(null);
  const [caseQuestions, setCaseQuestions] = useState([""]);

  const totalMcqs = useMemo(() => mcqs.length, [mcqs]);

  const setMcqField = (index, patch) => {
    setMcqs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const setMcqOption = (index, optIndex, value) => {
    setMcqs((prev) => {
      const copy = [...prev];
      const opts = [...copy[index].options];
      opts[optIndex] = value;
      copy[index] = { ...copy[index], options: opts };
      return copy;
    });
  };

  const addMcq = () => setMcqs((prev) => [...prev, makeEmptyMcq()]);
  const removeMcq = (index) => {
    setMcqs((prev) => {
      // keep at least 10 always
      if (prev.length <= 10) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const addCaseQuestion = () => setCaseQuestions((prev) => [...prev, ""]);
  const setCaseQuestion = (index, value) => {
    setCaseQuestions((prev) => prev.map((q, i) => (i === index ? value : q)));
  };
  const removeCaseQuestion = (index) => {
    setCaseQuestions((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const validate = () => {
    if (!chapterName.trim()) return "Chapter name is required.";
    if (!description.trim()) return "Description is required.";

    // MCQ validation: at least 10, each filled
    if (mcqs.length < 10) return "At least 10 MCQ questions are required.";

    for (let i = 0; i < mcqs.length; i++) {
      const q = mcqs[i];
      if (!q.question.trim()) return `MCQ #${i + 1}: question is required.`;
      if (q.options.some((o) => !String(o).trim()))
        return `MCQ #${i + 1}: all 4 options are required.`;
      if (!q.correct.trim()) return `MCQ #${i + 1}: correct answer is required.`;
    }

    // Case study is optional (if file chosen, questions must exist)
    if (caseFile) {
      const qs = caseQuestions.map((x) => x.trim()).filter(Boolean);
      if (qs.length < 1) return "Case study: add at least 1 question (or remove the case file).";
    }

    return "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();

      // text fields
      fd.append("chapterName", chapterName.trim());
      fd.append("description", description.trim());
      fd.append("notesText", notesText.trim());

      // ✅ Video upload (optional)
      if (video) fd.append("video", video);

      // files: multiple
      for (const f of materials) fd.append("materials", f);
      for (const f of notesFiles) fd.append("notesFiles", f);
      for (const f of taskFiles) fd.append("taskFiles", f);

      // case study
      if (caseFile) fd.append("caseFile", caseFile);

      // JSON arrays
      fd.append("mcqs", JSON.stringify(mcqs.map((m) => ({
        question: m.question.trim(),
        options: m.options.map((x) => String(x).trim()),
        correct: m.correct.trim(),
      }))));

      fd.append(
        "caseQuestions",
        JSON.stringify(caseQuestions.map((x) => x.trim()).filter(Boolean))
      );

      // ✅ backend route (we will create it below)
      // POST /api/teacher/courses/:id/chapters
      await apiForm(`/teacher/courses/${id}/chapters`, { method: "POST", formData: fd });

      alert("✅ Lesson/Chapter created successfully!");
      
      // Reset form to allow creating another lesson
      setChapterName("");
      setDescription("");
      setVideo(null);
      setMaterials([]);
      setNotesText("");
      setNotesFiles([]);
      setTaskFiles([]);
      setMcqs(Array.from({ length: 10 }, () => makeEmptyMcq()));
      setCaseFile(null);
      setCaseQuestions([""]);
      setError("");
      
      // Stay on the same page (no navigation)
    } catch (err) {
      setError(err.message || "Failed to create lesson.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="teacher-dashboard-layout">
      <NavbarAfterLogin user={user} />
      <div className="teacher-body">
        <TeacherSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="create-lesson-page">
          <div className="cl-header">
            <div>
              <h2>Create Lesson / Chapter</h2>
              <p className="cl-sub">
                Add chapter details, materials, notes, tasks, MCQs (min 10), and case study.
              </p>
            </div>

            <div className="cl-actions">
              <button className="cl-btn cl-btn-ghost" type="button" onClick={() => navigate(-1)}>
                ← Back
              </button>
            </div>
          </div>

          {error && (
            <div className="cl-alert">
              <strong>Error:</strong> {error}
            </div>
          )}

          <form className="cl-form" onSubmit={submit}>
            {/* Chapter info */}
            <section className="cl-card">
              <h3>Chapter Details</h3>

              <label>Chapter Name</label>
              <input
                type="text"
                value={chapterName}
                onChange={(e) => setChapterName(e.target.value)}
                placeholder="e.g., Chapter 1: Introduction"
                autoComplete="off"
              />

              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write chapter description..."
              />
            </section>

            {/* Video Upload - Separate Section */}
            <section className="cl-card" style={{ 
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)",
              border: "2px solid rgba(59, 130, 246, 0.3)"
            }}>
              <h3>📹 Lesson Video (Optional)</h3>
              <p className="cl-hint">
                Upload a video for this lesson. If provided, students will see the video first.
                If not provided, students will see lesson materials instead.
              </p>

              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideo((e.target.files || [])[0] || null)}
              />

              {video && (
                <div className="cl-fileitem" style={{ 
                  marginTop: "12px",
                  padding: "12px",
                  background: "#fff",
                  borderRadius: "8px",
                  border: "1px solid #3b82f6"
                }}>
                  <i className="fa-solid fa-video" style={{ marginRight: "8px", color: "#3b82f6" }}></i>
                  {video.name} ({(video.size / 1024 / 1024).toFixed(2)} MB)
                  <button
                    type="button"
                    onClick={() => setVideo(null)}
                    style={{
                      marginLeft: "12px",
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
            </section>

            {/* Materials */}
            <section className="cl-card">
              <h3>Upload Materials (Multiple)</h3>
              <p className="cl-hint">Supports PDF, Images, Docs, etc. (Videos should be uploaded in the Video section above)</p>

              <input
                type="file"
                multiple
                onChange={(e) => setMaterials(Array.from(e.target.files || []))}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp"
              />

              {materials.length > 0 && (
                <div className="cl-filelist">
                  {materials.map((f, i) => (
                    <div key={i} className="cl-fileitem">
                      {f.name}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Notes */}
            <section className="cl-card">
              <h3>Notes</h3>

              <label>Notes Text</label>
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Write notes for this chapter..."
              />

              <label>Notes Files (Multiple)</label>
              <input
                type="file"
                multiple
                onChange={(e) => setNotesFiles(Array.from(e.target.files || []))}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp"
              />

              {notesFiles.length > 0 && (
                <div className="cl-filelist">
                  {notesFiles.map((f, i) => (
                    <div key={i} className="cl-fileitem">
                      {f.name}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Task upload */}
            <section className="cl-card">
              <h3>Task Upload</h3>
              <p className="cl-hint">Upload assignments / task files (multiple).</p>

              <input
                type="file"
                multiple
                onChange={(e) => setTaskFiles(Array.from(e.target.files || []))}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp"
              />

              {taskFiles.length > 0 && (
                <div className="cl-filelist">
                  {taskFiles.map((f, i) => (
                    <div key={i} className="cl-fileitem">
                      {f.name}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* MCQ */}
            <section className="cl-card">
              <div className="cl-row">
                <h3>MCQ (Minimum 10 Required)</h3>
                <button type="button" className="cl-btn cl-btn-small" onClick={addMcq}>
                  + Add Question
                </button>
              </div>

              <p className="cl-hint">
                Total MCQ Questions: <strong>{totalMcqs}</strong> (cannot be less than 10)
              </p>

              <div className="mcq-list">
                {mcqs.map((m, idx) => (
                  <div key={idx} className="mcq-item">
                    <div className="mcq-header">
                      <h4>Question #{idx + 1}</h4>
                      <button
                        type="button"
                        className="cl-btn cl-btn-danger cl-btn-small"
                        onClick={() => removeMcq(idx)}
                        disabled={mcqs.length <= 10}
                        title={mcqs.length <= 10 ? "Minimum 10 required" : "Remove"}
                      >
                        Remove
                      </button>
                    </div>

                    <label>Question</label>
                    <input
                      type="text"
                      value={m.question}
                      onChange={(e) => setMcqField(idx, { question: e.target.value })}
                      placeholder="Enter MCQ question..."
                      autoComplete="off"
                    />

                    <div className="mcq-options">
                      {m.options.map((opt, oi) => (
                        <div key={oi}>
                          <label>Option {oi + 1}</label>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => setMcqOption(idx, oi, e.target.value)}
                            placeholder={`Option ${oi + 1}`}
                            autoComplete="off"
                          />
                        </div>
                      ))}
                    </div>

                    <label>Correct Answer</label>
                    <input
                      type="text"
                      value={m.correct}
                      onChange={(e) => setMcqField(idx, { correct: e.target.value })}
                      placeholder="Type the correct answer (must match one option)"
                      autoComplete="off"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Case study */}
            <section className="cl-card">
              <div className="cl-row">
                <h3>Case Study (Optional)</h3>
                <button type="button" className="cl-btn cl-btn-small" onClick={addCaseQuestion}>
                  + Add Question
                </button>
              </div>

              <label>Upload Case Study File</label>
              <input
                type="file"
                onChange={(e) => setCaseFile((e.target.files || [])[0] || null)}
                accept=".pdf,.doc,.docx"
              />

              {caseFile && <div className="cl-fileitem">{caseFile.name}</div>}

              <label>Case Study Questions</label>
              {caseQuestions.map((q, i) => (
                <div key={i} className="cl-row cl-row-gap">
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => setCaseQuestion(i, e.target.value)}
                    placeholder={`Case question ${i + 1}`}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="cl-btn cl-btn-danger cl-btn-small"
                    onClick={() => removeCaseQuestion(i)}
                    disabled={caseQuestions.length <= 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </section>

            {/* Submit */}
            <section className="cl-footer">
              <button className="cl-btn cl-btn-primary" type="submit" disabled={saving}>
                {saving ? "Submitting..." : "Submit Chapter"}
              </button>
              <button
                className="cl-btn cl-btn-ghost"
                type="button"
                onClick={() => navigate(-1)}
                disabled={saving}
              >
                Cancel
              </button>
            </section>
          </form>
        </main>
      </div>
    </div>
  );
};

export default CreateLesson;
