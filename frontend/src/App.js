import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Public
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import PlatformAnalytics from './pages/admin/PlatformAnalytics';
import TimetableManager from './pages/admin/TimetableManager';
import TrackingDashboard from './pages/admin/TrackingDashboard';

// Teacher
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import CreateQuiz from './pages/teacher/CreateQuiz';
import ManageQuizzes from './pages/teacher/ManageQuizzes';
import QuizAnalytics from './pages/teacher/QuizAnalytics';
import CreateNote from './pages/teacher/CreateNote';
import CreateChallenge from './pages/teacher/CreateChallenge';
import AttendancePortal from './pages/teacher/AttendancePortal';
import SectionResults from './pages/teacher/SectionResults';
import AddPracticeQuiz from './pages/teacher/AddPracticeQuiz';
// ↓ NEW: AI quiz generator + scheduling pages
import AIQuizGenerator from './pages/teacher/AIQuizGenerator';
import ScheduledQuizzes from './pages/teacher/ScheduledQuizzes';

// Student
import StudentDashboard from './pages/student/StudentDashboard';
import BrowseQuizzes from './pages/student/BrowseQuizzes';
import AttemptQuiz from './pages/student/AttemptQuiz';
import ResultPage from './pages/student/ResultPage';
import PerformanceAnalytics from './pages/student/PerformanceAnalytics';
import MyNotes from './pages/student/MyNotes';
import BrowseChallenges from './pages/student/BrowseChallenges';
import CodingEditor from './pages/student/CodingEditor';
import MyAttendance from './pages/student/MyAttendance';
import MyCodingResults from './pages/student/MyCodingResults';
import PracticeTest from './pages/student/PracticeTest';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--card)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/quizzes" element={<ProtectedRoute roles={['admin']}><ManageQuizzes /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute roles={['admin']}><PlatformAnalytics /></ProtectedRoute>} />
          <Route path="/admin/timetable" element={<ProtectedRoute roles={['admin']}><TimetableManager /></ProtectedRoute>} />
          <Route path="/admin/tracking" element={<ProtectedRoute roles={['admin']}><TrackingDashboard /></ProtectedRoute>} />

          {/* Teacher */}
          <Route path="/teacher" element={<ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/teacher/create-quiz" element={<ProtectedRoute roles={['teacher']}><CreateQuiz /></ProtectedRoute>} />
          <Route path="/teacher/quizzes" element={<ProtectedRoute roles={['teacher']}><ManageQuizzes /></ProtectedRoute>} />
          <Route path="/teacher/quiz-analytics/:id" element={<ProtectedRoute roles={['teacher', 'admin']}><QuizAnalytics /></ProtectedRoute>} />
          <Route path="/teacher/notes" element={<ProtectedRoute roles={['teacher']}><CreateNote /></ProtectedRoute>} />
          <Route path="/teacher/coding" element={<ProtectedRoute roles={['teacher', 'admin']}><CreateChallenge /></ProtectedRoute>} />
          <Route path="/teacher/attendance" element={<ProtectedRoute roles={['teacher', 'admin']}><AttendancePortal /></ProtectedRoute>} />
          <Route path="/teacher/section-results" element={<ProtectedRoute roles={['teacher', 'admin']}><SectionResults /></ProtectedRoute>} />
          <Route path="/teacher/practice" element={<ProtectedRoute roles={['teacher']}><AddPracticeQuiz /></ProtectedRoute>} />

          {/* ── NEW AI Feature Routes ─────────────────────────────────────── */}
          <Route path="/teacher/ai-generator"
            element={<ProtectedRoute roles={['teacher', 'admin']}><AIQuizGenerator /></ProtectedRoute>}
          />
          <Route path="/teacher/scheduled-quizzes"
            element={<ProtectedRoute roles={['teacher', 'admin']}><ScheduledQuizzes /></ProtectedRoute>}
          />
          {/* ─────────────────────────────────────────────────────────────── */}

          {/* Student */}
          <Route path="/student" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/quizzes" element={<ProtectedRoute roles={['student']}><BrowseQuizzes /></ProtectedRoute>} />
          <Route path="/student/attempt/:id" element={<ProtectedRoute roles={['student']}><AttemptQuiz /></ProtectedRoute>} />
          <Route path="/student/result/:id" element={<ProtectedRoute roles={['student']}><ResultPage /></ProtectedRoute>} />
          <Route path="/student/analytics" element={<ProtectedRoute roles={['student']}><PerformanceAnalytics /></ProtectedRoute>} />
          <Route path="/student/notes" element={<ProtectedRoute roles={['student']}><MyNotes /></ProtectedRoute>} />
          <Route path="/student/coding" element={<ProtectedRoute roles={['student']}><BrowseChallenges /></ProtectedRoute>} />
          <Route path="/student/coding/:id" element={<ProtectedRoute roles={['student']}><CodingEditor /></ProtectedRoute>} />
          <Route path="/student/attendance" element={<ProtectedRoute roles={['student']}><MyAttendance /></ProtectedRoute>} />
          <Route path="/student/coding-results" element={<ProtectedRoute roles={['student']}><MyCodingResults /></ProtectedRoute>} />
          <Route path="/student/practice" element={<ProtectedRoute roles={['student']}><PracticeTest /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
