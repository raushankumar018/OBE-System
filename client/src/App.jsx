import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import NewCoursePage from './pages/NewCoursePage';
import COReviewPage from './pages/COReviewPage';
import MappingPage from './pages/MappingPage';
import AttainmentPage from './pages/AttainmentPage';
import HistoryPage from './pages/HistoryPage';
import Layout from './components/Layout';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-ink flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-paper/40 font-body text-sm tracking-wider">LOADING</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1A1A2E',
              color: '#F5F4EF',
              border: '1px solid rgba(255,255,255,0.1)',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#D4FF3C', secondary: '#0A0A0F' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#F5F4EF' } },
          }}
        />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/course/new" element={<NewCoursePage />} />
            <Route path="/co/:sessionId/review" element={<COReviewPage />} />
            <Route path="/mapping/:sessionId" element={<MappingPage />} />
            <Route path="/attainment/:sessionId" element={<AttainmentPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
