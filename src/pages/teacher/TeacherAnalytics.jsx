import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
} from "recharts";
import "../../styles/TeacherDashboard.css";
import {
  teacherGetAnalytics,
  teacherGetMyCourses,
} from "../../services/api";

const TeacherAnalytics = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");

  useEffect(() => {
    loadAnalytics();
  }, [selectedCourse]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError("");
    try {
      const [analyticsData, coursesData] = await Promise.all([
        teacherGetAnalytics().catch((err) => {
          console.error("Error loading analytics:", err);
          return null;
        }),
        teacherGetMyCourses().catch((err) => {
          console.error("Error loading courses:", err);
          return { courses: [] };
        }),
      ]);

      setAnalytics(analyticsData);

      // Use courses from analytics if available, otherwise use from courses endpoint
      if (analyticsData && Array.isArray(analyticsData?.courses) && analyticsData.courses.length > 0) {
        setCourses(analyticsData.courses);
      } else if (Array.isArray(coursesData?.courses)) {
        setCourses(coursesData.courses);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const filteredAnalytics = useMemo(() => {
    if (!analytics) return null;
    if (selectedCourse === "all") return analytics;

    const selectedId = String(selectedCourse);
    const courseData = analytics.courseAnalytics.find((c) => {
      const courseId = String(c.courseId || c._id || "");
      return courseId === selectedId;
    });
    
    if (!courseData) return analytics;

    return {
      ...analytics,
      courseAnalytics: [courseData],
    };
  }, [analytics, selectedCourse]);

  return (
    <div className="teacher-content-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Analytics & Reports</h2>
          <p className="page-subtitle">Comprehensive insights into your teaching performance</p>
        </div>
        <div className="header-actions">
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Courses</option>
            {courses.map((c) => {
              const courseId = String(c._id || c.id || "");
              return (
                <option key={courseId} value={courseId}>
                  {c.title || "Untitled Course"}
                </option>
              );
            })}
          </select>
          <button className="btn-secondary" onClick={loadAnalytics}>
            <i className="fa-solid fa-rotate"></i> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <span>Loading analytics...</span>
        </div>
      ) : error ? (
        <div className="error-state">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>{error}</span>
          <button onClick={loadAnalytics} className="btn-retry">
            Retry
          </button>
        </div>
      ) : !filteredAnalytics ? (
        <div className="empty-state">
          <i className="fa-solid fa-chart-line"></i>
          <h3>No analytics data available</h3>
          <p>Start teaching courses to see analytics and reports</p>
        </div>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="stats-grid">
            <div className="stat-card stat-blue">
              <div className="stat-icon">
                <i className="fa-solid fa-users"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{filteredAnalytics.totalStudents}</div>
                <div className="stat-label">Total Students</div>
              </div>
            </div>

            <div className="stat-card stat-green">
              <div className="stat-icon">
                <i className="fa-solid fa-user-graduate"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{filteredAnalytics.totalEnrollments}</div>
                <div className="stat-label">Total Enrollments</div>
              </div>
            </div>

            <div className="stat-card stat-purple">
              <div className="stat-icon">
                <i className="fa-solid fa-clipboard-list"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{filteredAnalytics.totalAttempts}</div>
                <div className="stat-label">MCQ Attempts</div>
              </div>
            </div>

            <div className="stat-card stat-orange">
              <div className="stat-icon">
                <i className="fa-solid fa-percent"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{filteredAnalytics.passRate}%</div>
                <div className="stat-label">Pass Rate</div>
              </div>
            </div>

            <div className="stat-card stat-teal">
              <div className="stat-icon">
                <i className="fa-solid fa-chart-line"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{filteredAnalytics.avgScore}%</div>
                <div className="stat-label">Average Score</div>
              </div>
            </div>

            <div className="stat-card stat-red">
              <div className="stat-icon">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{filteredAnalytics.passedAttempts}</div>
                <div className="stat-label">Passed Attempts</div>
              </div>
            </div>
          </div>

          {/* Course-wise Analytics */}
          <div className="analytics-section">
            <h3 className="section-title">
              <i className="fa-solid fa-book"></i> Course Performance
            </h3>
            <div className="course-analytics-grid">
              {filteredAnalytics.courseAnalytics.map((course) => (
                <div key={course.courseId} className="course-analytics-card">
                  <div className="course-analytics-header">
                    <h4>{course.courseName}</h4>
                    <span className="progress-badge">{course.avgProgress}% Avg Progress</span>
                  </div>
                  <div className="course-analytics-stats">
                    <div className="analytics-stat-item">
                      <i className="fa-solid fa-users"></i>
                      <div>
                        <div className="stat-number">{course.students}</div>
                        <div className="stat-label-small">Students</div>
                      </div>
                    </div>
                    <div className="analytics-stat-item">
                      <i className="fa-solid fa-user-graduate"></i>
                      <div>
                        <div className="stat-number">{course.enrollments}</div>
                        <div className="stat-label-small">Enrollments</div>
                      </div>
                    </div>
                    <div className="analytics-stat-item">
                      <i className="fa-solid fa-clipboard-list"></i>
                      <div>
                        <div className="stat-number">{course.attempts}</div>
                        <div className="stat-label-small">MCQ Attempts</div>
                      </div>
                    </div>
                  </div>
                  <div className="course-progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${course.avgProgress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Trends - Dynamic Charts */}
          <div className="analytics-section">
            <h3 className="section-title">
              <i className="fa-solid fa-chart-bar"></i> Performance Trends
            </h3>

            {filteredAnalytics.courseAnalytics && filteredAnalytics.courseAnalytics.length > 0 ? (
              <div className="performance-charts-grid">
                {/* Course Performance Comparison */}
                <div className="chart-card">
                  <h4 className="chart-title">
                    <i className="fa-solid fa-chart-column"></i> Course Performance Comparison
                  </h4>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={filteredAnalytics.courseAnalytics}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="courseName"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "10px",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="students"
                        fill="#3b82f6"
                        name="Students"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="enrollments"
                        fill="#10b981"
                        name="Enrollments"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="attempts"
                        fill="#8b5cf6"
                        name="MCQ Attempts"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Average Progress by Course */}
                <div className="chart-card">
                  <h4 className="chart-title">
                    <i className="fa-solid fa-chart-line"></i> Average Progress by Course
                  </h4>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart
                      data={filteredAnalytics.courseAnalytics}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <defs>
                        <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="courseName"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#64748b" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "10px",
                        }}
                        formatter={(value) => [`${value}%`, "Progress"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="avgProgress"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fill="url(#progressGradient)"
                        name="Avg Progress"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Pass/Fail Distribution */}
                <div className="chart-card">
                  <h4 className="chart-title">
                    <i className="fa-solid fa-chart-pie"></i> Overall Pass/Fail Distribution
                  </h4>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: "Passed",
                            value: filteredAnalytics.passedAttempts || 0,
                            color: "#10b981",
                          },
                          {
                            name: "Failed",
                            value: filteredAnalytics.failedAttempts || 0,
                            color: "#ef4444",
                          },
                        ].filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent, value }) =>
                          `${name}: ${value} (${(percent * 100).toFixed(1)}%)`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "10px",
                        }}
                      />
                      <Legend
                        formatter={(value, entry) => (
                          <span style={{ color: entry.color, fontWeight: 600 }}>
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Pass Rate by Course */}
                <div className="chart-card">
                  <h4 className="chart-title">
                    <i className="fa-solid fa-percent"></i> Pass Rate by Course
                  </h4>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={filteredAnalytics.courseAnalytics.map((course) => ({
                        ...course,
                        passRate: course.passRate || 0,
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="courseName"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        label={{ value: "Pass Rate (%)", angle: -90, position: "insideLeft" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "10px",
                        }}
                        formatter={(value) => [`${value}%`, "Pass Rate"]}
                      />
                      <Bar
                        dataKey="passRate"
                        fill="#10b981"
                        name="Pass Rate (%)"
                        radius={[8, 8, 0, 0]}
                      >
                        {filteredAnalytics.courseAnalytics.map((course, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              (course.passRate || 0) >= 70
                                ? "#10b981"
                                : (course.passRate || 0) >= 50
                                ? "#f59e0b"
                                : "#ef4444"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Course Performance Radar */}
                {filteredAnalytics.courseAnalytics.length <= 5 && (
                  <div className="chart-card">
                    <h4 className="chart-title">
                      <i className="fa-solid fa-spider"></i> Multi-Course Performance Radar
                    </h4>
                    <ResponsiveContainer width="100%" height={350}>
                      <RadarChart data={filteredAnalytics.courseAnalytics.map((course) => ({
                        course: course.courseName.length > 15
                          ? course.courseName.substring(0, 15) + "..."
                          : course.courseName,
                        Students: course.students || 0,
                        Enrollments: course.enrollments || 0,
                        "MCQ Attempts": course.attempts || 0,
                        "Avg Progress": course.avgProgress || 0,
                      }))}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis
                          dataKey="course"
                          tick={{ fontSize: 11, fill: "#64748b" }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, "dataMax"]}
                          tick={{ fontSize: 10, fill: "#64748b" }}
                        />
                        <Radar
                          name="Students"
                          dataKey="Students"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.6}
                        />
                        <Radar
                          name="Enrollments"
                          dataKey="Enrollments"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.6}
                        />
                        <Radar
                          name="MCQ Attempts"
                          dataKey="MCQ Attempts"
                          stroke="#8b5cf6"
                          fill="#8b5cf6"
                          fillOpacity={0.6}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            padding: "10px",
                          }}
                        />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Score Distribution */}
                <div className="chart-card">
                  <h4 className="chart-title">
                    <i className="fa-solid fa-chart-area"></i> Course Engagement Metrics
                  </h4>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart
                      data={filteredAnalytics.courseAnalytics}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="courseName"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "10px",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="students"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ fill: "#3b82f6", r: 5 }}
                        name="Students"
                      />
                      <Line
                        type="monotone"
                        dataKey="enrollments"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ fill: "#10b981", r: 5 }}
                        name="Enrollments"
                      />
                      <Line
                        type="monotone"
                        dataKey="attempts"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        dot={{ fill: "#8b5cf6", r: 5 }}
                        name="MCQ Attempts"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Performance Summary Table */}
                <div className="chart-card full-width">
                  <h4 className="chart-title">
                    <i className="fa-solid fa-table"></i> Detailed Performance Summary
                  </h4>
                  <div className="performance-table-container">
                    <table className="performance-table">
                      <thead>
                        <tr>
                          <th>Course Name</th>
                          <th>Students</th>
                          <th>Enrollments</th>
                          <th>MCQ Attempts</th>
                          <th>Pass Rate</th>
                          <th>Avg Progress</th>
                          <th>Performance Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAnalytics.courseAnalytics.map((course, idx) => {
                          // Calculate performance score (weighted average)
                          const maxAttempts = Math.max(
                            ...filteredAnalytics.courseAnalytics.map((c) => c.attempts || 0),
                            1
                          );
                          const maxStudents = Math.max(
                            ...filteredAnalytics.courseAnalytics.map((c) => c.students || 0),
                            1
                          );
                          const performanceScore = Math.round(
                            ((course.attempts / maxAttempts) * 30 +
                              (course.students / maxStudents) * 30 +
                              (course.avgProgress / 100) * 40)
                          );

                          // Use pass rate from course data (now included in backend response)
                          const coursePassRate = course.passRate || 0;

                          return (
                            <tr key={course.courseId || idx}>
                              <td>
                                <strong>{course.courseName}</strong>
                              </td>
                              <td>
                                <span className="metric-badge blue">{course.students}</span>
                              </td>
                              <td>
                                <span className="metric-badge green">{course.enrollments}</span>
                              </td>
                              <td>
                                <span className="metric-badge purple">{course.attempts}</span>
                              </td>
                              <td>
                                <span
                                  className={`metric-badge ${
                                    coursePassRate >= 70
                                      ? "green"
                                      : coursePassRate >= 50
                                      ? "orange"
                                      : "red"
                                  }`}
                                >
                                  {coursePassRate}%
                                </span>
                              </td>
                              <td>
                                <div className="progress-cell-inline">
                                  <div className="progress-bar-inline">
                                    <div
                                      className="progress-fill-inline"
                                      style={{
                                        width: `${course.avgProgress}%`,
                                        backgroundColor:
                                          course.avgProgress >= 75
                                            ? "#10b981"
                                            : course.avgProgress >= 50
                                            ? "#3b82f6"
                                            : "#f59e0b",
                                      }}
                                    />
                                  </div>
                                  <span className="progress-text-inline">
                                    {course.avgProgress}%
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div className="performance-score">
                                  <div
                                    className={`score-circle ${
                                      performanceScore >= 70
                                        ? "excellent"
                                        : performanceScore >= 50
                                        ? "good"
                                        : "needs-improvement"
                                    }`}
                                  >
                                    {performanceScore}
                                  </div>
                                  <span className="score-label">/ 100</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="chart-placeholder">
                <i className="fa-solid fa-chart-line"></i>
                <p>No course data available for performance trends</p>
                <small>Create courses and students need to enroll to see trends</small>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TeacherAnalytics;
