import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import "../../styles/TeacherDashboard.css";
import TeacherSidebar from "./TeacherSidebar";
import NavbarAfterLogin from "./NavbarAfterLogin";
import EnrolledStudents from "./EnrolledStudents";
import McqAttempts from "./McqAttempts";
import TeacherAnalytics from "./TeacherAnalytics";
import {
  teacherGetEnrolledStudents,
  teacherGetAnalytics,
  teacherGetMyCourses,
} from "../../services/api";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const token =
    localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");

  const user = useMemo(() => {
    try {
      const raw =
        localStorage.getItem("bs_user") || sessionStorage.getItem("bs_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // Determine active tab from route
  useEffect(() => {
    const path = location.pathname;
    if (path === "/teacher-dashboard") setActiveTab("dashboard");
    else if (path === "/create-course") setActiveTab("create-course");
    else if (path === "/view-courses") setActiveTab("view-courses");
    else if (path === "/teacher/enrolled-students") setActiveTab("enrolled-students");
    else if (path === "/teacher/mcq-attempts") setActiveTab("mcq-attempts");
    else if (path === "/teacher/analytics") setActiveTab("analytics");
    else if (path === "/reports") setActiveTab("reports");
  }, [location.pathname]);

  // Fetch enrolled students, analytics, and courses data for dashboard
  useEffect(() => {
    if (activeTab === "dashboard" && token) {
      const fetchDashboardData = async () => {
        try {
          setLoading(true);
          const [studentsData, analyticsData, coursesData] = await Promise.all([
            teacherGetEnrolledStudents().catch(() => ({ students: [] })),
            teacherGetAnalytics().catch(() => null),
            teacherGetMyCourses().catch(() => ({ courses: [] })),
          ]);
          setEnrolledStudents(studentsData?.students || []);
          setAnalytics(analyticsData);
          setCourses(coursesData?.courses || []);
        } catch (error) {
          console.error("Error fetching dashboard data:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchDashboardData();
    }
  }, [activeTab, token]);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const role = user?.role || "student";
    if (role !== "teacher") {
      if (role === "admin") navigate("/admin-dashboard", { replace: true });
      else navigate("/student-dashboard", { replace: true });
    }
  }, [token, user, navigate]);

  // Ensure sidebar is always visible on desktop/tablet (above 768px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(false); // Close overlay, sidebar will be visible via CSS
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Check on mount

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="teacher-dashboard-layout">
      <NavbarAfterLogin user={user} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Hamburger Button Bar - Below Navbar */}
      <div className="hamburger-bar">
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          type="button"
          aria-label="Toggle sidebar menu"
        >
          <i className={`fa-solid ${sidebarOpen ? "fa-times" : "fa-bars"}`}></i>
          <span>Menu</span>
        </button>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <div className="teacher-body">
        <TeacherSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="teacher-content">
          {/* ======= DASHBOARD HOME ======= */}
          {activeTab === "dashboard" && (
            <>
              <div className="teacher-hero">
                <div>
                  <h3>Teacher Dashboard</h3>
                  <p>Overview of your courses and enrolled students.</p>
                </div>

                <div className="teacher-heroRight">
                  <div className="teacher-pill">
                    <span className="dot" />
                    <span>Online</span>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="teacher-loading">
                  <p>Loading dashboard data...</p>
                </div>
              ) : (
                <>
                  {/* Statistics Cards */}
                  <div className="teacher-stats-grid">
                    <div className="teacher-stat-card">
                      <div className="stat-icon">
                        <i className="fa-solid fa-user-graduate" />
                      </div>
                      <div className="stat-content">
                        <h3>{analytics?.totalStudents || enrolledStudents.length || 0}</h3>
                        <p>Total Students</p>
                      </div>
                    </div>

                    <div className="teacher-stat-card">
                      <div className="stat-icon">
                        <i className="fa-solid fa-book" />
                      </div>
                      <div className="stat-content">
                        <h3>{courses.length || 0}</h3>
                        <p>Total Courses</p>
                      </div>
                    </div>

                    <div className="teacher-stat-card">
                      <div className="stat-icon">
                        <i className="fa-solid fa-list-check" />
                      </div>
                      <div className="stat-content">
                        <h3>{analytics?.totalAttempts || 0}</h3>
                        <p>MCQ Attempts</p>
                      </div>
                    </div>

                    <div className="teacher-stat-card">
                      <div className="stat-icon">
                        <i className="fa-solid fa-chart-line" />
                      </div>
                      <div className="stat-content">
                        <h3>{analytics?.passRate || 0}%</h3>
                        <p>Pass Rate</p>
                      </div>
                    </div>
                  </div>

                  {/* Comprehensive Course Analytics Graph */}
                  <div className="teacher-dashboard-section">
                    <div className="section-header">
                      <h3>Course Analytics Overview</h3>
                    </div>

                    {analytics?.courseAnalytics && Array.isArray(analytics.courseAnalytics) && analytics.courseAnalytics.length > 0 ? (
                      <div className="teacher-charts-container">
                        {/* Course Enrollment Chart */}
                        <div className="chart-wrapper">
                          <h4>Students Enrolled per Course</h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.courseAnalytics}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="courseName"
                                angle={-45}
                                textAnchor="end"
                                height={100}
                                interval={0}
                              />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="students" fill="#2f6bff" name="Students" />
                              <Bar dataKey="enrollments" fill="#3f86ff" name="Enrollments" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Course Progress Chart */}
                        <div className="chart-wrapper">
                          <h4>Average Progress per Course</h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analytics.courseAnalytics}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="courseName"
                                angle={-45}
                                textAnchor="end"
                                height={100}
                                interval={0}
                              />
                              <YAxis domain={[0, 100]} />
                              <Tooltip />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="avgProgress"
                                stroke="#2f6bff"
                                strokeWidth={3}
                                name="Avg Progress %"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        {/* MCQ Attempts per Course */}
                        <div className="chart-wrapper">
                          <h4>MCQ Attempts per Course</h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.courseAnalytics}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="courseName"
                                angle={-45}
                                textAnchor="end"
                                height={100}
                                interval={0}
                              />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="attempts" fill="#10b981" name="MCQ Attempts" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Overall Statistics Pie Chart */}
                        <div className="chart-wrapper">
                          <h4>Overall Statistics</h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={[
                                  {
                                    name: "Passed Attempts",
                                    value: analytics.passedAttempts || 0,
                                  },
                                  {
                                    name: "Failed Attempts",
                                    value: analytics.failedAttempts || 0,
                                  },
                                ].filter((d) => d.value > 0)}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) =>
                                  `${name}: ${(percent * 100).toFixed(0)}%`
                                }
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                <Cell fill="#10b981" />
                                <Cell fill="#ef4444" />
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Course Details Table */}
                        <div className="chart-wrapper full-width">
                          <h4>Detailed Course Information</h4>
                          <div className="teacher-table-container">
                            <table className="teacher-table">
                              <thead>
                                <tr>
                                  <th>Course Name</th>
                                  <th>Students</th>
                                  <th>Enrollments</th>
                                  <th>MCQ Attempts</th>
                                  <th>Avg Progress</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analytics.courseAnalytics.map((course, idx) => (
                                  <tr key={course.courseId || idx}>
                                    <td>
                                      <strong>{course.courseName}</strong>
                                    </td>
                                    <td>{course.students}</td>
                                    <td>{course.enrollments}</td>
                                    <td>{course.attempts}</td>
                                    <td>
                                      <div className="progress-bar-container">
                                        <div className="progress-bar">
                                          <div
                                            className="progress-fill"
                                            style={{ width: `${course.avgProgress}%` }}
                                          />
                                        </div>
                                        <span>{course.avgProgress}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="teacher-empty-state">
                        <i className="fa-solid fa-chart-line" />
                        <p>No course data available yet. Create courses to see analytics.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === "courses" && (
            <div className="content-section">
              <h3>📚 Courses</h3>
              <p>Select an option from the sidebar: Create Course / View Courses.</p>
            </div>
          )}

          {activeTab === "create-course" && (
            <div className="content-section">
              <h3>➕ Create Course</h3>
              <p>Here you will add the course creation form.</p>
            </div>
          )}

          {activeTab === "view-courses" && (
            <div className="content-section">
              <h3>📄 View Courses</h3>
              <p>Here you will list all created courses.</p>
            </div>
          )}

          {activeTab === "mcq" && (
            <div className="content-section">
              <h3>✅ MCQ Management</h3>
              <p>Select an option from the sidebar: Create MCQ.</p>
            </div>
          )}

          {activeTab === "create-mcq" && (
            <div className="content-section">
              <h3>✍️ Create MCQ</h3>
              <p>Here you will add the MCQ creation form.</p>
            </div>
          )}

          {activeTab === "case" && (
            <div className="content-section">
              <h3>📂 Case Study Upload</h3>
              <p>Upload or update case studies for teaching materials.</p>
            </div>
          )}

          {activeTab === "enrolled-students" && <EnrolledStudents />}
          {activeTab === "mcq-attempts" && <McqAttempts />}
          {activeTab === "analytics" && <TeacherAnalytics />}

          {activeTab === "reports" && (
            <div className="content-section">
              <h3>📊 Reports</h3>
              <p>Analyze student performance and attendance reports here.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default TeacherDashboard;
