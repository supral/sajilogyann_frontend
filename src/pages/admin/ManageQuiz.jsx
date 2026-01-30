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

/**
 * Tries multiple endpoints (supports both /api and /api/v1)
 */
const apiFetchCandidates = async (paths, options = {}) => {
  let last = null;

  for (const prefix of API_PREFIXES) {
    for (const path of paths) {
      const url = `${API_HOST}${prefix}${path}`;
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

  const msg =
    last?.data?.message ||
    last?.error ||
    `API not found. Last tried: ${last?.url || "unknown endpoint"}`;
  throw new Error(msg);
};

const toDateInput = (v) => {
  const d = v ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const calcPercent = (obtained, total) => {
  const o = Number(obtained || 0);
  const t = Number(total || 0);
  if (!t) return 0;
  return Math.round((o / t) * 100);
};

export default function ManageQuiz() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("quiz");

  // data
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [attempts, setAttempts] = useState([]);
  const [search, setSearch] = useState("");

  // server paging (optional)
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // view modal
  const [viewing, setViewing] = useState(null);

  const token = getToken();

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  // ✅ Sidebar navigation (match your admin pages)
  const handleMenuClick = (secId) => {
    setActiveSection(secId);

    if (secId === "quiz") return;
    if (secId === "teacher") return navigate("/admin/teachers");
    if (secId === "course") return navigate("/admin/courses");
    if (secId === "case") return navigate("/admin/casestudies");
    if (secId === "transactions") return navigate("/admin/transactions");
    if (secId === "analytics") return navigate("/admin/analytics");

    return navigate("/admin");
  };

  const loadAttempts = async (p = 1) => {
    setErr("");
    setLoading(true);

    try {
      // ✅ This endpoint is added by the backend code I gave above
      const candidates = [
        `/admin/mcq-attempts?q=${encodeURIComponent(search || "")}&page=${p}&limit=50`,
        `/admin/attempts?q=${encodeURIComponent(search || "")}&page=${p}&limit=50`, // fallback (if you name it differently)
      ];

      const { data } = await apiFetchCandidates(candidates, {
        method: "GET",
        headers: authHeaders,
      });

      const list = data.attempts || data.data || data.results || (Array.isArray(data) ? data : []);
      setAttempts(Array.isArray(list) ? list : []);

      const pg = data.pagination || {};
      setPage(pg.page || p);
      setPages(pg.pages || 1);
    } catch (e) {
      setErr(e?.message || "Failed to load quiz attempts");
      setAttempts([]);
      setPage(1);
      setPages(1);
    } finally {
      setLoading(false);
    }
  };

  // initial + whenever page changes
  useEffect(() => {
    loadAttempts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced-ish search (simple)
  useEffect(() => {
    const t = setTimeout(() => loadAttempts(1), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Build table rows (your UI format)
  const rows = useMemo(() => {
    return attempts.map((a) => {
      const percent = calcPercent(a.marksObtained, a.totalMarks);
      const status =
        String(a.result || "").toLowerCase() === "pass" ? "Passed" : "Failed";

      return {
        id: a._id || a.id,
        studentName: a.studentName || "Student",
        quizTitle: `${a.courseName || "Course"} — ${a.chapterName || "Chapter"}`,
        enrolledOn: toDateInput(a.createdAt),
        attempts: a.attemptNo ?? 1,
        score: percent,
        status,
        raw: a,
      };
    });
  }, [attempts]);

  const filtered = useMemo(() => {
    // already searching server-side, but keep client filter too (safe)
    const term = search.toLowerCase().trim();
    if (!term) return rows;

    return rows.filter((r) => {
      return (
        r.studentName.toLowerCase().includes(term) ||
        r.quizTitle.toLowerCase().includes(term) ||
        r.status.toLowerCase().includes(term)
      );
    });
  }, [rows, search]);

  const removeAttempt = async (row) => {
    const id = row?.id;
    if (!id) return;

    const ok = window.confirm("Delete this quiz attempt record?");
    if (!ok) return;

    setErr("");
    try {
      const candidates = [`/admin/mcq-attempts/${id}`];

      await apiFetchCandidates(candidates, {
        method: "DELETE",
        headers: authHeaders,
      });

      setAttempts((prev) => prev.filter((x) => (x._id || x.id) !== id));
    } catch (e) {
      setErr(e?.message || "Failed to delete record");
    }
  };

  return (
    <div className={`admin-layout ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <Navbar />

      <div className="admin-container">
        <AdminSidebar
          activeSection={activeSection}
          setActiveSection={handleMenuClick}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <main className="admin-main">
          <div className="page-header-row">
            <h1 className="page-title">Quiz Management (MCQ Attempts)</h1>

            <button
              className="update-btn"
              onClick={() => loadAttempts(page)}
              disabled={loading}
              title="Refresh"
            >
              ⟳ Refresh
            </button>
          </div>

          <div className="search-bar-container">
            <input
              type="text"
              className="search-bar"
              placeholder="🔍 Search by student, course/chapter, pass/fail..."
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
                  loadAttempts(next);
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
                  loadAttempts(next);
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
                <th>STUDENT NAME</th>
                <th>QUIZ TITLE</th>
                <th>DATE</th>
                <th>ATTEMPT #</th>
                <th>SCORE (%)</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "1rem" }}>
                    Loading quiz attempts...
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{r.studentName}</td>
                    <td>{r.quizTitle}</td>
                    <td>{r.enrolledOn || "-"}</td>
                    <td>{r.attempts}</td>
                    <td title={`${r.raw?.marksObtained ?? 0}/${r.raw?.totalMarks ?? 0}`}>
                      {r.score}
                    </td>
                    <td>{r.status}</td>
                    <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="edit-btn" onClick={() => setViewing(r.raw)}>
                        View
                      </button>
                      <button className="delete-btn" onClick={() => removeAttempt(r)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "1rem" }}>
                    No quiz attempt records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </main>
      </div>

      {/* ===== VIEW MODAL ===== */}
      {viewing && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 720 }}>
            <h3 style={{ marginBottom: 6 }}>Quiz Attempt Detail</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <strong>Student:</strong> {viewing.studentName}
              </div>
              <div>
                <strong>Result:</strong>{" "}
                {String(viewing.result).toLowerCase() === "pass" ? "Passed" : "Failed"}
              </div>

              <div>
                <strong>Course:</strong> {viewing.courseName}
              </div>
              <div>
                <strong>Chapter:</strong> {viewing.chapterName}
              </div>

              <div>
                <strong>Marks:</strong> {viewing.marksObtained}/{viewing.totalMarks} (
                {calcPercent(viewing.marksObtained, viewing.totalMarks)}%)
              </div>
              <div>
                <strong>Attempt #:</strong> {viewing.attemptNo ?? 1}
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <strong>Date:</strong> {toDateInput(viewing.createdAt)}
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <strong>Answers (saved object):</strong>
                <pre
                  style={{
                    marginTop: 8,
                    padding: 10,
                    background: "#f6f7fb",
                    borderRadius: 10,
                    maxHeight: 240,
                    overflow: "auto",
                    fontSize: 12,
                  }}
                >
                  {JSON.stringify(viewing.answers || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="modal-actions">
              <button className="update-btn" onClick={() => setViewing(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
