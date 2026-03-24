import React, { lazy, Suspense, useMemo, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import MaintenanceWatcher from "./components/MaintenanceWatcher";
import ProtectedRoute from "./routes/ProtectedRoute";
import { useAppLogo } from "./hooks/useAppLogo.js";

const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const About = lazy(() => import("./pages/about"));
const PublicCourseDetail = lazy(() => import("./pages/PublicCourseDetail"));
const Courses = lazy(() => import("./pages/Courses"));
const Contact = lazy(() => import("./pages/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Academy = lazy(() => import("./pages/Academy"));
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const StudentProfile = lazy(() => import("./pages/student/StudentProfile"));
const ChangePassword = lazy(() => import("./pages/student/ChangePassword"));
const AcademyPro = lazy(() => import("./pages/student/AcademyPro"));
const StudentCourseDetail = lazy(() => import("./pages/student/StudentCourseDetail"));
const StudentFileViewer = lazy(() => import("./pages/student/StudentFileViewer"));
const StudentLessonViewer = lazy(() => import("./pages/student/StudentLessonViewer"));
const MCQTest = lazy(() => import("./pages/student/MCQTest"));
const HowToGetCertificate = lazy(() => import("./pages/student/HowToGetCertificate"));
const TeacherDashboard = lazy(() => import("./pages/teacher/TeacherDashboard"));
const TeacherProfile = lazy(() => import("./pages/teacher/TeacherProfile"));
const CreateCourse = lazy(() => import("./pages/teacher/CreateCourse"));
const ViewCourses = lazy(() => import("./pages/teacher/ViewCourses"));
const ArchivedCourses = lazy(() => import("./pages/teacher/ArchivedCourses"));
const CourseDetail = lazy(() => import("./pages/teacher/CourseDetail"));
const CreateMCQ = lazy(() => import("./pages/teacher/CreateMCQ"));
const Reports = lazy(() => import("./pages/teacher/Reports"));
const CreateLesson = lazy(() => import("./pages/teacher/CreateLesson"));
const LessonDetail = lazy(() => import("./pages/teacher/LessonDetail"));
const EditLessonDetail = lazy(() => import("./pages/teacher/EditLessonDetail"));
const TeacherStudentDetail = lazy(() => import("./pages/teacher/TeacherStudentDetail"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const ManageTeacher = lazy(() => import("./pages/admin/ManageTeacher"));
const ManageCourse = lazy(() => import("./pages/admin/ManageCourse"));
const ManageQuiz = lazy(() => import("./pages/admin/ManageQuiz"));
const ManageCaseStudy = lazy(() => import("./pages/admin/ManageCaseStudy"));
const AnalyticsReports = lazy(() => import("./pages/admin/AnalyticsReports"));
const UserDetail = lazy(() => import("./pages/admin/UserDetail"));
const ManageUsers = lazy(() => import("./pages/admin/ManageUsers"));
const AdminCourseDetail = lazy(() => import("./pages/admin/AdminCourseDetail"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminArchivedCourses = lazy(() => import("./pages/admin/AdminArchivedCourses"));
const EnrolledCourses = lazy(() => import("./pages/student/EnrolledCourses"));
const StudentArchivedCourses = lazy(() => import("./pages/student/ArchivedCourses"));
const Assignments = lazy(() => import("./pages/student/Assignments"));
const ProgressTracker = lazy(() => import("./pages/student/ProgressTracker"));
const PracticeQuizzes = lazy(() => import("./pages/student/PracticeQuizzes"));
const Certificates = lazy(() => import("./pages/student/Certificates"));
const Notifications = lazy(() => import("./pages/student/Notifications"));
const StudentActivityLog = lazy(() => import("./pages/student/StudentActivityLog"));
const TeacherActivityLog = lazy(() => import("./pages/teacher/TeacherActivityLog"));
const AdminActivityLog = lazy(() => import("./pages/admin/AdminActivityLog"));
const KhaltiReturn = lazy(() => import("./pages/payment/KhaltiReturn"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const NotFound = lazy(() => import("./pages/errors/NotFound"));
const Unauthorized = lazy(() => import("./pages/errors/Unauthorized"));

/** Sets document title from app settings (dynamic). */
function DocumentTitle() {
  const { appName } = useAppLogo();
  React.useEffect(() => {
    if (appName) document.title = `${appName} – Learn, Grow, Achieve`;
  }, [appName]);
  return null;
}

function RouteFallback() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        color: "#64748b",
        fontSize: "0.95rem",
      }}
    >
      Loading…
    </div>
  );
}

const API_HOST = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

/** If user has an active session (token + role), redirect to their dashboard; otherwise show landing.
 * When maintenance is ON: only admin is redirected to dashboard; students/teachers see landing so landing stays visible to everyone. */
function HomeOrRedirect() {
  const token = localStorage.getItem("bs_token") || sessionStorage.getItem("bs_token");
  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem("bs_user") || sessionStorage.getItem("bs_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
  const storedRole =
    localStorage.getItem("bs_role") || sessionStorage.getItem("bs_role") ||
    localStorage.getItem("userRole") || sessionStorage.getItem("userRole");
  const role = (user?.role || storedRole || "").toString().trim().toLowerCase();

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`${API_HOST}/api/public/system-status`, { headers: { Accept: "application/json" } });
        if (!res.ok) {
          const alt = await fetch(`${API_HOST}/api/v1/public/system-status`, { headers: { Accept: "application/json" } });
          if (alt.ok) {
            const d = await alt.json();
            if (!cancelled) setMaintenanceMode(!!d?.status?.maintenanceMode);
          }
          return;
        }
        const d = await res.json();
        if (!cancelled) setMaintenanceMode(!!d?.status?.maintenanceMode);
      } catch {
        // keep false
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  if (token && role) {
    if (maintenanceMode) {
      if (role === "admin") return <Navigate to="/admin-dashboard" replace />;
      return <LandingPage />;
    }
    if (role === "admin") return <Navigate to="/admin-dashboard" replace />;
    if (role === "teacher") return <Navigate to="/teacher-dashboard" replace />;
    return <Navigate to="/student-dashboard" replace />;
  }
  return <LandingPage />;
}

const App = () => {
  return (
    <Router>
      <DocumentTitle />
      <MaintenanceWatcher />

      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomeOrRedirect />} />
        <Route path="/course/:id" element={<PublicCourseDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/academy" element={<Academy />} />

        {/* ✅ Maintenance Page */}
        <Route path="/maintenance" element={<Maintenance />} />

        {/* ✅ Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ✅ Khalti return */}
        <Route
          path="/payment/khalti"
          element={
            <ProtectedRoute allowRoles={["student"]}>
              <KhaltiReturn />
            </ProtectedRoute>
          }
        />

        {/* ✅ STUDENT */}
        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute allowRoles={["student"]}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/profile"
          element={
            <ProtectedRoute allowRoles={["student"]}>
              <StudentProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/how-to-get-certificate"
          element={
            <ProtectedRoute allowRoles={["student"]}>
              <HowToGetCertificate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute allowRoles={["student", "teacher", "admin"]}>
              <ChangePassword />
            </ProtectedRoute>
          }
        />
        <Route
          path="/academy-pro"
          element={
            <ProtectedRoute allowRoles={["student"]}>
              <AcademyPro />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/course/:id"
          element={
            <ProtectedRoute allowRoles={["student"]}>
              <StudentCourseDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/courses/:id"
          element={
            <ProtectedRoute allowRoles={["student"]}>
              <StudentCourseDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/courses/:courseId/lessons/:lessonId"
          element={
            <ProtectedRoute allowRoles={["student"]}>
              <StudentLessonViewer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/courses/:id/chapters/:chapterId/file"
          element={
            <ProtectedRoute allowRoles={["student"]}>
              <StudentFileViewer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/courses/:id/chapters/:chapterId/mcq"
          element={
            <ProtectedRoute allowRoles={["student"]}>
              <MCQTest />
            </ProtectedRoute>
          }
        />

        {/* ✅ TEACHER */}
        <Route
          path="/teacher-dashboard"
          element={
            <ProtectedRoute allowRoles={["teacher"]}>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/profile"
          element={
            <ProtectedRoute allowRoles={["teacher"]}>
              <TeacherProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-course"
          element={
            <ProtectedRoute allowRoles={["teacher"]}>
              <CreateCourse />
            </ProtectedRoute>
          }
        />
        <Route
          path="/view-courses"
          element={
            <ProtectedRoute allowRoles={["teacher"]}>
              <ViewCourses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/archived-courses"
          element={
            <ProtectedRoute allowRoles={["teacher"]}>
              <ArchivedCourses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/course-detail/:id"
          element={
            <ProtectedRoute allowRoles={["teacher"]}>
              <CourseDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-mcq"
          element={
            <ProtectedRoute allowRoles={["teacher"]}>
              <CreateMCQ />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowRoles={["teacher"]}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/enrolled-students"
          element={
            <ProtectedRoute allowRoles={["teacher"]}>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/student/:studentId"
          element={
            <ProtectedRoute allowRoles={["teacher"]}>
              <TeacherStudentDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/mcq-attempts"
          element={
            <ProtectedRoute allowRoles={["teacher"]}>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/analytics"
          element={
            <ProtectedRoute allowRoles={["teacher"]}>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/activity-log"
          element={
            <ProtectedRoute allowRoles={["teacher"]}>
              <TeacherActivityLog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/courses/:id/create-lesson"
          element={
            <ProtectedRoute allowRoles={["teacher"]}>
              <CreateLesson />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/courses/:id/chapters/:chapterId/edit"
          element={
            <ProtectedRoute allowRoles={["teacher"]}>
              <EditLessonDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/courses/:id/chapters/:chapterId"
          element={
            <ProtectedRoute allowRoles={["teacher"]}>
              <LessonDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/courses/:id/lessons/:chapterId"
          element={
            <ProtectedRoute allowRoles={["teacher"]}>
              <LessonDetail />
            </ProtectedRoute>
          }
        />

        {/* ✅ ADMIN */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <ManageUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/user/:id"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <UserDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/teachers"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <ManageTeacher />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/courses"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <ManageCourse />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/archived-courses"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <AdminArchivedCourses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/courses/:id"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <AdminCourseDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/quizzes"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <ManageQuiz />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/casestudies"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <ManageCaseStudy />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <AnalyticsReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <AdminSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/activity-log"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <AdminActivityLog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/activity-log"
          element={
            <ProtectedRoute allowRoles={["student"]}>
              <StudentActivityLog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/enrolled-courses"
          element={
            <ProtectedRoute allowRoles={["student"]}>
              <EnrolledCourses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/archived-courses"
          element={
            <ProtectedRoute allowRoles={["student"]}>
              <StudentArchivedCourses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/assignments"
          element={
            <ProtectedRoute allowRoles={["student"]}>
              <Assignments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/progress-tracker"
          element={
            <ProtectedRoute allowRoles={["student"]}>
              <ProgressTracker />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/practice-quizzes"
          element={
            <ProtectedRoute allowRoles={["student"]}>
              <PracticeQuizzes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/certificates"
          element={
            <ProtectedRoute allowRoles={["student"]}>
              <Certificates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/notifications"
          element={
            <ProtectedRoute allowRoles={["student"]}>
              <Notifications />
            </ProtectedRoute>
          }
        />

        {/* ✅ Error Pages */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/not-found" element={<NotFound />} />
        
        {/* ✅ 404 - Catch all unknown routes */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
