import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProximityNotificationProvider } from './contexts/ProximityNotificationContext'
import Home from './pages/Home'
import Map from './pages/Map'
import Feed from './pages/Feed'
import Report from './pages/Report'
import HazardDetail from './pages/HazardDetail'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import { Header, BottomBar } from './components/Header'


function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-[#e5e2e1]">
        Loading authentication...
      </div>
    );
  }

  return (
    <ProximityNotificationProvider>
      <div className="min-h-screen bg-[#0a0a0a] font-['Space_Grotesk'] text-white">

        {isAuthenticated && <Header />}

        <main className={`${isAuthenticated ? 'pt-16 pb-20 md:pb-0' : ''}`}>
          <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/feed" replace /> : <Login />} />
            <Route path="/signup" element={isAuthenticated ? <Navigate to="/feed" replace /> : <SignUp />} />

            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/map" element={<ProtectedRoute><Map /></ProtectedRoute>} />
            <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
            <Route path="/hazard/:id" element={<ProtectedRoute><HazardDetail /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to={isAuthenticated ? '/feed' : '/login'} replace />} />
          </Routes>
        </main>

        {isAuthenticated && <BottomBar />}

      </div>
    </ProximityNotificationProvider>
  )
}

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppContent />
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}

export default App