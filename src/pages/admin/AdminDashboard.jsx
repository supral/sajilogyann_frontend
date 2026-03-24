import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import AdminSidebar from "./AdminSidebar";
import "../../styles/admin.css";

// ✅ Charts (Recharts)
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

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

const monthKey = (iso) => {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "Unknown";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

// ✅ nice bar colors (repeat cycle)
const BAR_COLORS = [
  "#2563eb", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#22c55e", // emerald
  "#e11d48", // rose
  "#0ea5e9", // sky
  "#a855f7", // purple
  "#f97316", // orange
  "#14b8a6", // teal
];

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const token = getToken();
  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(true);
  const [err, setErr] = useState("");
  const [reportErr, setReportErr] = useState("");

  const [stats, setStats] = useState({
    studentsCount: 0,
    teachersCount: 0,
    coursesCount: 0,
    quizzesCount: 0,
  });

  const [report, setReport] = useState({
    students: [],
    teachers: [],
    courses: [],
    lessons: [],
    chapters: [],
  });

  useEffect(() => {
    setActiveSection("dashboard");
  }, [location.key]);

  const loadStats = async () => {
    setErr("");
    setLoading(true);
    try {
      const { data } = await apiFetchCandidates(["/admin/stats"], {
        method: "GET",
        headers: authHeaders,
      });

      setStats({
        studentsCount: Number(data.studentsCount || 0),
        teachersCount: Number(data.teachersCount || 0),
        coursesCount: Number(data.coursesCount || 0),
        quizzesCount: Number(data.quizzesCount || 0),
      });
    } catch (e) {
      setErr(e?.message || "Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  };

  const loadFullReport = async () => {
    setReportErr("");
    setLoadingReport(true);
    try {
      const { data } = await apiFetchCandidates(
        ["/admin/reports/full?limit=500"],
        {
          method: "GET",
          headers: authHeaders,
        }
      );

      const payload = data?.data || {};
      setReport({
        students: payload.students || [],
        teachers: payload.teachers || [],
        courses: payload.courses || [],
        lessons: payload.lessons || [],
        chapters: payload.chapters || [],
      });
    } catch (e) {
      setReportErr(
        e?.message ||
          "Failed to load full report. Ensure /api/v1/admin/reports/full exists."
      );
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadFullReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAll = async () => {
    await Promise.all([loadStats(), loadFullReport()]);
  };

  // ✅ GRAPH DATA
  const totalsBarData = useMemo(
    () => [
      { name: "Students", value: stats.studentsCount },
      { name: "Teachers", value: stats.teachersCount },
      { name: "Courses", value: stats.coursesCount },
      { name: "Quizzes", value: stats.quizzesCount },
    ],
    [stats]
  );

  const coursesByCategory = useMemo(() => {
    const map = new Map();
    for (const c of report.courses || []) {
      const key = (c.category || "Uncategorized").trim() || "Uncategorized";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, value]) => ({ name, value }));
  }, [report.courses]);

  const usersPerMonth = useMemo(() => {
    const s = new Map();
    const t = new Map();

    for (const u of report.students || []) {
      const k = monthKey(u.createdAt);
      s.set(k, (s.get(k) || 0) + 1);
    }
    for (const u of report.teachers || []) {
      const k = monthKey(u.createdAt);
      t.set(k, (t.get(k) || 0) + 1);
    }

    const keys = new Set([...s.keys(), ...t.keys()]);
    const sorted = Array.from(keys).sort();

    return sorted.map((k) => ({
      month: k,
      students: s.get(k) || 0,
      teachers: t.get(k) || 0,
    }));
  }, [report.students, report.teachers]);

  const lessonsPerCourse = useMemo(() => {
    const counts = new Map();

    const add = (arr) => {
      for (const x of arr || []) {
        const courseTitle = x.courseId?.title || "Unknown Course";
        counts.set(courseTitle, (counts.get(courseTitle) || 0) + 1);
      }
    };

    add(report.lessons);
    add(report.chapters);

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [report.lessons, report.chapters]);

  const coursesPerTeacher = useMemo(() => {
    const map = new Map();
    for (const c of report.courses || []) {
      const teacherName = c.teacherId?.name || "Unassigned";
      map.set(teacherName, (map.get(teacherName) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [report.courses]);

  // ✅ helper: render different color per bar
  const renderColoredCells = (data) =>
    data.map((_, idx) => (
      <Cell
        key={`cell-${idx}`}
        fill={BAR_COLORS[idx % BAR_COLORS.length]}
      />
    ));

  return (
    <div className={`admin-layout ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <Navbar />

      <div className="admin-container">
        <AdminSidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <main className="admin-main">
          <div
            className="admin-page-header"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
          >
            <div>
              <h2 className="page-title" style={{ marginBottom: 4 }}>
                Admin Dashboard
              </h2>
              <p style={{ marginTop: 0, opacity: 0.8 }}>
                {loading
                  ? "Loading dashboard…"
                  : "Live stats from database. Use the menu to manage users, teachers, courses, and settings."}
              </p>
            </div>

            <div className="dashboard-header-actions">
              <button
                type="button"
                className="update-btn"
                onClick={refreshAll}
                disabled={loading || loadingReport}
                aria-label="Refresh dashboard data"
              >
                <i className="fa-solid fa-rotate-right" aria-hidden />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {err ? (
            <div
              className="admin-card"
              style={{
                borderLeft: "4px solid #ef4444",
                marginTop: 12,
              }}
            >
              <b>Error:</b> {err}
            </div>
          ) : null}

          {reportErr ? (
            <div
              className="admin-card"
              style={{
                borderLeft: "4px solid #f59e0b",
                marginTop: 12,
              }}
            >
              <b>Report Warning:</b> {reportErr}
              <div style={{ marginTop: 6, opacity: 0.75 }}>
                This affects advanced graphs. Totals chart still works.
              </div>
            </div>
          ) : null}

          {/* OVERVIEW SECTION */}
          <section className="dashboard-section" aria-labelledby="overview-heading">
            <h2 id="overview-heading" className="dashboard-section-title">Overview</h2>
            <div className="dashboard-overview">
              <div className="stat-card">
                <span className="stat-card-icon" aria-hidden>👩‍🎓</span>
                <span className="stat-card-label">Total Students</span>
                <span className="stat-card-value">{stats.studentsCount}</span>
                <button type="button" className="edit-btn stat-card-btn" onClick={() => navigate("/admin/users")}>
                  Manage Users
                </button>
              </div>
              <div className="stat-card">
                <span className="stat-card-icon" aria-hidden>👨‍🏫</span>
                <span className="stat-card-label">Total Teachers</span>
                <span className="stat-card-value">{stats.teachersCount}</span>
                <button type="button" className="edit-btn stat-card-btn" onClick={() => navigate("/admin/teachers")}>
                  Manage Teachers
                </button>
              </div>
              <div className="stat-card">
                <span className="stat-card-icon" aria-hidden>📚</span>
                <span className="stat-card-label">Active Courses</span>
                <span className="stat-card-value">{stats.coursesCount}</span>
                <button type="button" className="edit-btn stat-card-btn" onClick={() => navigate("/admin/courses")}>
                  Manage Courses
                </button>
              </div>
              <div className="stat-card">
                <span className="stat-card-icon" aria-hidden>🧩</span>
                <span className="stat-card-label">Quizzes Available</span>
                <span className="stat-card-value">{stats.quizzesCount}</span>
                <button type="button" className="edit-btn stat-card-btn" onClick={() => navigate("/admin/quizzes")}>
                  Manage Quizzes
                </button>
              </div>
            </div>
          </section>

          {/* ANALYTICS SECTION */}
          <section className="dashboard-section" aria-labelledby="analytics-heading">
            <h2 id="analytics-heading" className="dashboard-section-title">Analytics</h2>
            <div className="dashboard-charts-wrapper admin-card">
              <p className="dashboard-charts-intro">
                Live charts from database. Empty charts mean no data yet—add content and refresh.
              </p>
              <div className="dashboard-charts-grid">
                <div className="dashboard-chart-card admin-card chart-full">
                  <h4 className="chart-title">Overview Totals</h4>
                  <div className="chart-inner">
                    {totalsBarData.some((d) => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={totalsBarData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" name="Count">{renderColoredCells(totalsBarData)}</Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="chart-empty">No data yet. Refresh after adding content.</p>
                    )}
                  </div>
                </div>

                <div className="dashboard-chart-card admin-card chart-half">
                  <h4 className="chart-title">Courses by Category (Top)</h4>
                  <div className="chart-inner">
                    {coursesByCategory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={coursesByCategory} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={70} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="value" name="Courses">{renderColoredCells(coursesByCategory)}</Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="chart-empty">No categories yet.</p>
                    )}
                  </div>
                </div>

                <div className="dashboard-chart-card admin-card chart-half">
                  <h4 className="chart-title">Lessons/Chapters per Course (Top)</h4>
                  <div className="chart-inner">
                    {lessonsPerCourse.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={lessonsPerCourse} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={70} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="value" name="Lessons/Chapters">{renderColoredCells(lessonsPerCourse)}</Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="chart-empty">No lessons/chapters yet.</p>
                    )}
                  </div>
                </div>

                <div className="dashboard-chart-card admin-card chart-half">
                  <h4 className="chart-title">Courses per Teacher (Top)</h4>
                  <div className="chart-inner">
                    {coursesPerTeacher.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={coursesPerTeacher} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={70} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="value" name="Courses">{renderColoredCells(coursesPerTeacher)}</Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="chart-empty">No courses yet.</p>
                    )}
                  </div>
                </div>

                <div className="dashboard-chart-card admin-card chart-half">
                  <h4 className="chart-title">New Users per Month</h4>
                  <div className="chart-inner">
                    {usersPerMonth.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={usersPerMonth} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Line dataKey="students" name="Students" stroke="#2563eb" dot={false} />
                          <Line dataKey="teachers" name="Teachers" stroke="#10b981" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="chart-empty">No user signups yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
