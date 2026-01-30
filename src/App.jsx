import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import PublicCourseDetail from "./pages/PublicCourseDetail";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import About from "./pages/about";

import StudentDashboard from "./pages/student/StudentDashboard";
import StudentProfile from "./pages/student/StudentProfile";
import ChangePassword from "./pages/student/ChangePassword";
import AcademyPro from "./pages/student/AcademyPro";
import StudentCourseDetail from "./pages/student/StudentCourseDetail";
import StudentFileViewer from "./pages/student/StudentFileViewer";
import StudentLessonViewer from "./pages/student/StudentLessonViewer";
import MCQTest from "./pages/student/MCQTest";
import HowToGetCertificate from "./pages/student/HowToGetCertificate";

import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherProfile from "./pages/teacher/TeacherProfile";
import CreateCourse from "./pages/teacher/CreateCourse";
import ViewCourses from "./pages/teacher/ViewCourses";
import ArchivedCourses from "./pages/teacher/ArchivedCourses";
import CourseDetail from "./pages/teacher/CourseDetail";
import CreateMCQ from "./pages/teacher/CreateMCQ";
import Reports from "./pages/teacher/Reports";
import CreateLesson from "./pages/teacher/CreateLesson";
import LessonDetail from "./pages/teacher/LessonDetail";
import EditLessonDetail from "./pages/teacher/EditLessonDetail";
import EnrolledStudents from "./pages/teacher/EnrolledStudents";
import McqAttempts from "./pages/teacher/McqAttempts";
import TeacherAnalytics from "./pages/teacher/TeacherAnalytics";

import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageTeacher from "./pages/admin/ManageTeacher";
import ManageCourse from "./pages/admin/ManageCourse";
import ManageQuiz from "./pages/admin/ManageQuiz";
import ManageCaseStudy from "./pages/admin/ManageCaseStudy";
import AnalyticsReports from "./pages/admin/AnalyticsReports";
import UserDetail from "./pages/admin/UserDetail";
import ManageUsers from "./pages/admin/ManageUsers";
import AdminCourseDetail from "./pages/admin/AdminCourseDetail";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminArchivedCourses from "./pages/admin/AdminArchivedCourses";
import EnrolledCourses from "./pages/student/EnrolledCourses";
import StudentArchivedCourses from "./pages/student/ArchivedCourses";
import Assignments from "./pages/student/Assignments";
import ProgressTracker from "./pages/student/ProgressTracker";
import PracticeQuizzes from "./pages/student/PracticeQuizzes";
import Certificates from "./pages/student/Certificates";
import Notifications from "./pages/student/Notifications";
import ProtectedRoute from "./routes/ProtectedRoute";

// ✅ payment
import KhaltiReturn from "./pages/payment/KhaltiReturn";

// ✅ maintenance
import Maintenance from "./pages/Maintenance";
import MaintenanceWatcher from "./components/MaintenanceWatcher";

// ✅ error pages
import NotFound from "./pages/errors/NotFound";
import Unauthorized from "./pages/errors/Unauthorized";

const App = () => {
  return (
    <Router>
      {/* ✅ ALWAYS WATCH MAINTENANCE MODE */}
      <MaintenanceWatcher />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/course/:id" element={<PublicCourseDetail />} />
        <Route path="/about" element={<About />} />

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
            <ProtectedRoute allowRoles={["student"]}>
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
    </Router>
  );
};

export default App;
