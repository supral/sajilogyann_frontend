import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    for (const path of paths) {
      const url = `${API_HOST}${prefix}${path}`;
      try {
        const res = await fetch(url, options);
        const data = await safeJson(res);
        if (res.ok) return { data, url };
        last = { data, url };
      } catch (e) {
        last = { error: e?.message || "Network error", url };
      }
    }
  }
  throw new Error(last?.data?.message || last?.error || `API error. Last: ${last?.url}`);
};

const toDateInput = (v) => {
  const d = v ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const ManageCaseStudy = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("case");

  const token = getToken();
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  // Lists for dropdowns (dynamic)
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Case studies data
  const [caseStudies, setCaseStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [newCase, setNewCase] = useState({
    studentId: "",
    supervisorId: "",
    caseTitle: "",
    courseName: "",
    submittedOn: "",
    status: "Submitted",
    score: "",
  });

  const [editData, setEditData] = useState({
    studentId: "",
    supervisorId: "",
    caseTitle: "",
    courseName: "",
    submittedOn: "",
    status: "",
    score: "",
  });

  // Sidebar navigation
  const handleMenuClick = (secId) => {
    setActiveSection(secId);

    if (secId === "case") return;
    if (secId === "teacher") return navigate("/admin/teachers");
    if (secId === "course") return navigate("/admin/courses");
    if (secId === "quiz") return navigate("/admin/quizzes");
    if (secId === "analytics") return navigate("/admin/analytics");
    if (secId === "transactions") return navigate("/admin");

    return navigate("/admin");
  };

  const loadDropdowns = async () => {
    try {
      // ✅ students from existing admin users endpoint in your backend zip
      const { data: stuData } = await apiFetchCandidates(
        [`/admin/users?role=student&limit=1000`],
        { method: "GET", headers }
      );

      // ✅ teachers from existing admin teachers endpoint
      const { data: teaData } = await apiFetchCandidates(
        [`/admin/teachers?limit=1000`],
        { method: "GET", headers }
      );

      const st = stuData.users || stuData.data || [];
      const tt = teaData.teachers || teaData.data || [];

      setStudents(Array.isArray(st) ? st : []);
      setTeachers(Array.isArray(tt) ? tt : []);
    } catch (e) {
      // not fatal
      console.warn("Dropdown load failed:", e?.message);
    }
  };

  const loadCaseStudies = async (p = 1) => {
    setErr("");
    setLoading(true);
    try {
      const { data } = await apiFetchCandidates(
        [`/admin/case-studies?q=${encodeURIComponent(search)}&page=${p}&limit=50`],
        { method: "GET", headers }
      );

      const list = data.caseStudies || data.data || (Array.isArray(data) ? data : []);
      setCaseStudies(Array.isArray(list) ? list : []);

      const pg = data.pagination || {};
      setPage(pg.page || p);
      setPages(pg.pages || 1);
    } catch (e) {
      setErr(e?.message || "Failed to load case studies");
      setCaseStudies([]);
      setPage(1);
      setPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDropdowns();
    loadCaseStudies(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadCaseStudies(1), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return caseStudies;

    return caseStudies.filter((c) => {
      const a = (c.studentName || "").toLowerCase();
      const b = (c.caseTitle || "").toLowerCase();
      const d = (c.courseName || "").toLowerCase();
      const e = (c.supervisorName || "").toLowerCase();
      const f = (c.status || "").toLowerCase();
      return a.includes(term) || b.includes(term) || d.includes(term) || e.includes(term) || f.includes(term);
    });
  }, [caseStudies, search]);

  // ===== ADD =====
  const handleNewChange = (e) => {
    const { name, value } = e.target;
    setNewCase((prev) => ({ ...prev, [name]: value }));
  };

  const resetNewCase = () => {
    setNewCase({
      studentId: "",
      supervisorId: "",
      caseTitle: "",
      courseName: "",
      submittedOn: "",
      status: "Submitted",
      score: "",
    });
  };

  const handleAddCase = async () => {
    const { studentId, supervisorId, caseTitle, courseName, submittedOn, status, score } = newCase;

    if (!studentId || !supervisorId || !caseTitle || !courseName || !submittedOn || !status) {
      alert("Please fill all required fields.");
      return;
    }

    setErr("");
    try {
      const { data } = await apiFetchCandidates([`/admin/case-studies`], {
        method: "POST",
        headers,
        body: JSON.stringify({
          studentId,
          supervisorId,
          caseTitle,
          courseName,
          submittedOn,
          status,
          score,
        }),
      });

      const created = data.caseStudy || data;
      setCaseStudies((prev) => [created, ...prev]);

      resetNewCase();
      setIsAddModalOpen(false);
      alert("Case study added successfully!");
    } catch (e) {
      setErr(e?.message || "Failed to add case study");
      alert(e?.message || "Failed to add case study");
    }
  };

  // ===== EDIT =====
  const startEdit = (record) => {
    setEditing(record);
    setEditData({
      studentId: record.studentId || "",
      supervisorId: record.supervisorId || "",
      caseTitle: record.caseTitle || "",
      courseName: record.courseName || "",
      submittedOn: toDateInput(record.submittedOn),
      status: record.status || "",
      score: record.score == null ? "" : String(record.score),
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const saveEdit = async () => {
    if (!editing?._id) return;

    setErr("");
    try {
      const { data } = await apiFetchCandidates([`/admin/case-studies/${editing._id}`], {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          studentId: editData.studentId,
          supervisorId: editData.supervisorId,
          caseTitle: editData.caseTitle,
          courseName: editData.courseName,
          submittedOn: editData.submittedOn,
          status: editData.status,
          score: editData.score,
        }),
      });

      const updated = data.caseStudy || data;

      setCaseStudies((prev) => prev.map((c) => (c._id === editing._id ? updated : c)));
      setEditing(null);
      alert("Case study updated successfully!");
    } catch (e) {
      setErr(e?.message || "Failed to update case study");
      alert(e?.message || "Failed to update case study");
    }
  };

  const removeCase = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this case study record?")) return;

    setErr("");
    try {
      await apiFetchCandidates([`/admin/case-studies/${id}`], {
        method: "DELETE",
        headers,
      });

      setCaseStudies((prev) => prev.filter((c) => c._id !== id));
      alert("Record deleted.");
    } catch (e) {
      setErr(e?.message || "Failed to delete case study");
      alert(e?.message || "Failed to delete case study");
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
          <div className="page-header-row">
            <h1 className="page-title">Case Studies</h1>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="edit-btn" onClick={() => loadCaseStudies(page)} disabled={loading}>
                ⟳ Refresh
              </button>

              <button className="update-btn" onClick={() => setIsAddModalOpen(true)}>
                + Add Case Study
              </button>
            </div>
          </div>

          <div className="search-bar-container">
            <input
              type="text"
              className="search-bar"
              placeholder="🔍 Search by student, title, course, supervisor or status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {err ? (
            <div style={{ margin: "10px 0", padding: "10px", background: "#ffecec", borderRadius: 8 }}>
              <strong style={{ color: "#b00020" }}>Error:</strong> {err}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <span style={{ opacity: 0.8 }}>
              {loading ? "Loading..." : `Total shown: ${filtered.length}`}
            </span>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className="edit-btn"
                onClick={() => {
                  const next = Math.max(1, page - 1);
                  setPage(next);
                  loadCaseStudies(next);
                }}
                disabled={loading || page <= 1}
              >
                ◀ Prev
              </button>

              <span style={{ opacity: 0.8 }}>
                Page <strong>{page}</strong> / {pages}
              </span>

              <button
                className="edit-btn"
                onClick={() => {
                  const next = Math.min(pages, page + 1);
                  setPage(next);
                  loadCaseStudies(next);
                }}
                disabled={loading || page >= pages}
              >
                Next ▶
              </button>
            </div>
          </div>

          <table className="user-table">
            <thead>
              <tr>
                <th>STUDENT</th>
                <th>CASE TITLE</th>
                <th>COURSE</th>
                <th>SUPERVISOR</th>
                <th>SUBMITTED ON</th>
                <th>STATUS</th>
                <th>SCORE (%)</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "1rem" }}>
                    Loading case studies...
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((c) => (
                  <tr key={c._id}>
                    <td>{c.studentName || "-"}</td>
                    <td>{c.caseTitle}</td>
                    <td>{c.courseName}</td>
                    <td>{c.supervisorName || "-"}</td>
                    <td>{toDateInput(c.submittedOn)}</td>
                    <td>{c.status}</td>
                    <td>{c.score == null ? "-" : c.score}</td>
                    <td>
                      <button className="edit-btn" onClick={() => startEdit(c)}>
                        Edit
                      </button>
                      <button className="delete-btn" onClick={() => removeCase(c._id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "1rem" }}>
                    No case study records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </main>
      </div>

      {/* ===== ADD MODAL ===== */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add Case Study</h3>

            <label>Student <span style={{ color: "red" }}>*</span></label>
            <select name="studentId" value={newCase.studentId} onChange={handleNewChange}>
              <option value="">Select Student</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>

            <label>Case Title <span style={{ color: "red" }}>*</span></label>
            <input
              type="text"
              name="caseTitle"
              placeholder="Enter case title"
              value={newCase.caseTitle}
              onChange={handleNewChange}
            />

            <label>Course Name <span style={{ color: "red" }}>*</span></label>
            <input
              type="text"
              name="courseName"
              placeholder="Enter related course"
              value={newCase.courseName}
              onChange={handleNewChange}
            />

            <label>Supervisor (Teacher) <span style={{ color: "red" }}>*</span></label>
            <select name="supervisorId" value={newCase.supervisorId} onChange={handleNewChange}>
              <option value="">Select Supervisor</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>

            <label>Submitted On <span style={{ color: "red" }}>*</span></label>
            <input type="date" name="submittedOn" value={newCase.submittedOn} onChange={handleNewChange} />

            <label>Status <span style={{ color: "red" }}>*</span></label>
            <select name="status" value={newCase.status} onChange={handleNewChange}>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>

            <label>Score (%) (Optional)</label>
            <input
              type="number"
              name="score"
              min="0"
              max="100"
              value={newCase.score}
              onChange={handleNewChange}
              placeholder="Enter score if evaluated"
            />

            <div className="modal-actions">
              <button className="update-btn" onClick={handleAddCase}>
                Save Case
              </button>
              <button
                className="delete-btn"
                onClick={() => {
                  resetNewCase();
                  setIsAddModalOpen(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT MODAL ===== */}
      {editing && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Case Study</h3>
            <p>Student: <strong>{editing.studentName}</strong></p>

            <label>Student (Optional change)</label>
            <select name="studentId" value={editData.studentId} onChange={handleEditChange}>
              <option value="">Select Student</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>

            <label>Case Title</label>
            <input type="text" name="caseTitle" value={editData.caseTitle} onChange={handleEditChange} />

            <label>Course Name</label>
            <input type="text" name="courseName" value={editData.courseName} onChange={handleEditChange} />

            <label>Supervisor</label>
            <select name="supervisorId" value={editData.supervisorId} onChange={handleEditChange}>
              <option value="">Select Supervisor</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>

            <label>Submitted On</label>
            <input type="date" name="submittedOn" value={editData.submittedOn} onChange={handleEditChange} />

            <label>Status</label>
            <select name="status" value={editData.status} onChange={handleEditChange}>
              <option value="">Select Status</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>

            <label>Score (%)</label>
            <input type="number" name="score" min="0" max="100" value={editData.score} onChange={handleEditChange} />

            <div className="modal-actions">
              <button className="update-btn" onClick={saveEdit}>
                Save Changes
              </button>
              <button className="delete-btn" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCaseStudy;
