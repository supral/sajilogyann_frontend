import React, { useEffect, useMemo, useState } from "react";
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
        if (res.ok) return { data };
        last = { data, url };
      } catch (e) {
        last = { error: e?.message || "Network error", url };
      }
    }
  }
  throw new Error(last?.data?.message || last?.error || `API error. Last: ${last?.url}`);
};

const fmtDate = (v) => {
  const d = v ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime())) return "-";
  return d.toISOString().slice(0, 10);
};

const AnalyticsReports = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("analytics");

  const token = getToken();
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [counts, setCounts] = useState({
    studentsCount: 0,
    teachersCount: 0,
    coursesCount: 0,
    lessonsCount: 0,
    chaptersCount: 0,
  });

  const [data, setData] = useState({
    students: [],
    teachers: [],
    courses: [],
    lessons: [],
    chapters: [],
  });

  const [qStudents, setQStudents] = useState("");
  const [qTeachers, setQTeachers] = useState("");
  const [qCourses, setQCourses] = useState("");
  const [qLessons, setQLessons] = useState("");

  const loadReport = async () => {
    setErr("");
    setLoading(true);
    try {
      const { data } = await apiFetchCandidates([`/admin/reports/full?limit=500`], {
        method: "GET",
        headers,
      });

      setCounts(data.counts || {});
      setData(data.data || {});
    } catch (e) {
      setErr(e?.message || "Failed to load analytics report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const studentsFiltered = useMemo(() => {
    const t = qStudents.toLowerCase().trim();
    if (!t) return data.students || [];
    return (data.students || []).filter((u) => {
      return (
        (u.name || "").toLowerCase().includes(t) ||
        (u.email || "").toLowerCase().includes(t) ||
        (u.phone || "").toLowerCase().includes(t)
      );
    });
  }, [data.students, qStudents]);

  const teachersFiltered = useMemo(() => {
    const t = qTeachers.toLowerCase().trim();
    if (!t) return data.teachers || [];
    return (data.teachers || []).filter((u) => {
      return (
        (u.name || "").toLowerCase().includes(t) ||
        (u.email || "").toLowerCase().includes(t) ||
        (u.phone || "").toLowerCase().includes(t)
      );
    });
  }, [data.teachers, qTeachers]);

  const coursesFiltered = useMemo(() => {
    const t = qCourses.toLowerCase().trim();
    if (!t) return data.courses || [];
    return (data.courses || []).filter((c) => {
      const teacherName = c.teacherId?.name || "";
      return (
        (c.title || "").toLowerCase().includes(t) ||
        (c.category || "").toLowerCase().includes(t) ||
        teacherName.toLowerCase().includes(t)
      );
    });
  }, [data.courses, qCourses]);

  const lessonsCombined = useMemo(() => {
    // Your project has both Lesson and Chapter models
    // We'll show lessons first; if lessons empty, chapters will still appear in the combined list.
    const lessons = data.lessons || [];
    const chapters = data.chapters || [];

    // mark type for display
    const L = lessons.map((x) => ({ ...x, __type: "Lesson" }));
    const C = chapters.map((x) => ({ ...x, __type: "Chapter" }));

    // combine
    return [...L, ...C].sort((a, b) => {
      const ad = new Date(a.createdAt || 0).getTime();
      const bd = new Date(b.createdAt || 0).getTime();
      return bd - ad;
    });
  }, [data.lessons, data.chapters]);

  const lessonsFiltered = useMemo(() => {
    const t = qLessons.toLowerCase().trim();
    if (!t) return lessonsCombined;
    return lessonsCombined.filter((l) => {
      const courseTitle = l.courseId?.title || "";
      const teacherName = l.teacherId?.name || "";
      return (
        (l.chapterName || "").toLowerCase().includes(t) ||
        (l.description || "").toLowerCase().includes(t) ||
        courseTitle.toLowerCase().includes(t) ||
        teacherName.toLowerCase().includes(t) ||
        (l.__type || "").toLowerCase().includes(t)
      );
    });
  }, [lessonsCombined, qLessons]);

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
          <div className="page-header-row">
            <h1 className="page-title">Analytics & Reports</h1>
            <button className="update-btn" onClick={loadReport} disabled={loading}>
              ⟳ Refresh Report
            </button>
          </div>

          {err ? (
            <div style={{ margin: "10px 0", padding: "10px", background: "#ffecec", borderRadius: 8 }}>
              <strong style={{ color: "#b00020" }}>Error:</strong> {err}
            </div>
          ) : null}

          {/* ✅ SUMMARY CARDS */}
          <div className="dashboard-overview" style={{ marginTop: 12 }}>
            <div className="stat-card">👩‍🎓 Students: {counts.studentsCount ?? 0}</div>
            <div className="stat-card">👨‍🏫 Teachers: {counts.teachersCount ?? 0}</div>
            <div className="stat-card">📚 Courses: {counts.coursesCount ?? 0}</div>
            <div className="stat-card">📖 Lessons: {counts.lessonsCount ?? 0}</div>
            <div className="stat-card">🧩 Chapters: {counts.chaptersCount ?? 0}</div>
          </div>

          {/* ✅ STUDENTS */}
          <div className="user-management" style={{ marginTop: 18 }}>
            <h2>All Students</h2>
            <input
              className="search-bar"
              placeholder="Search students by name/email/phone..."
              value={qStudents}
              onChange={(e) => setQStudents(e.target.value)}
            />

            <table className="user-table">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>EMAIL</th>
                  <th>PHONE</th>
                  <th>CREATED</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{ textAlign: "center", padding: 16 }}>Loading...</td></tr>
                ) : studentsFiltered.length ? (
                  studentsFiltered.map((u) => (
                    <tr key={u._id}>
                      <td>{u.name || "-"}</td>
                      <td>{u.email || "-"}</td>
                      <td>{u.phone || "-"}</td>
                      <td>{fmtDate(u.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" style={{ textAlign: "center", padding: 16 }}>No students found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ✅ TEACHERS */}
          <div className="user-management" style={{ marginTop: 18 }}>
            <h2>All Teachers</h2>
            <input
              className="search-bar"
              placeholder="Search teachers by name/email/phone..."
              value={qTeachers}
              onChange={(e) => setQTeachers(e.target.value)}
            />

            <table className="user-table">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>EMAIL</th>
                  <th>PHONE</th>
                  <th>CREATED</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{ textAlign: "center", padding: 16 }}>Loading...</td></tr>
                ) : teachersFiltered.length ? (
                  teachersFiltered.map((u) => (
                    <tr key={u._id}>
                      <td>{u.name || "-"}</td>
                      <td>{u.email || "-"}</td>
                      <td>{u.phone || "-"}</td>
                      <td>{fmtDate(u.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" style={{ textAlign: "center", padding: 16 }}>No teachers found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ✅ COURSES */}
          <div className="user-management" style={{ marginTop: 18 }}>
            <h2>All Courses</h2>
            <input
              className="search-bar"
              placeholder="Search courses by title/category/teacher..."
              value={qCourses}
              onChange={(e) => setQCourses(e.target.value)}
            />

            <table className="user-table">
              <thead>
                <tr>
                  <th>TITLE</th>
                  <th>CATEGORY</th>
                  <th>DURATION</th>
                  <th>TEACHER</th>
                  <th>CREATED</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ textAlign: "center", padding: 16 }}>Loading...</td></tr>
                ) : coursesFiltered.length ? (
                  coursesFiltered.map((c) => (
                    <tr key={c._id}>
                      <td>{c.title}</td>
                      <td>{c.category}</td>
                      <td>{c.duration}</td>
                      <td>{c.teacherId?.name || "-"}</td>
                      <td>{fmtDate(c.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" style={{ textAlign: "center", padding: 16 }}>No courses found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ✅ LESSONS / CHAPTERS */}
          <div className="user-management" style={{ marginTop: 18 }}>
            <h2>All Lessons / Chapters</h2>
            <input
              className="search-bar"
              placeholder="Search by chapter name/course/teacher/type..."
              value={qLessons}
              onChange={(e) => setQLessons(e.target.value)}
            />

            <table className="user-table">
              <thead>
                <tr>
                  <th>TYPE</th>
                  <th>CHAPTER / LESSON NAME</th>
                  <th>COURSE</th>
                  <th>TEACHER</th>
                  <th>CREATED</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ textAlign: "center", padding: 16 }}>Loading...</td></tr>
                ) : lessonsFiltered.length ? (
                  lessonsFiltered.map((l) => (
                    <tr key={l._id}>
                      <td>{l.__type}</td>
                      <td>{l.chapterName || "-"}</td>
                      <td>{l.courseId?.title || "-"}</td>
                      <td>{l.teacherId?.name || "-"}</td>
                      <td>{fmtDate(l.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" style={{ textAlign: "center", padding: 16 }}>No lessons/chapters found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AnalyticsReports;
