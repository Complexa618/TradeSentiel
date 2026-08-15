import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import LogTrade from './pages/LogTrade';
import Calendar from './pages/Calendar';
import Strategies from './pages/Strategies';
import Milestones from './pages/Milestones';
import ComingSoon from './pages/ComingSoon';

function Protected({ children }) {
  const { user, ready } = useApp();
  if (!ready) return <div className="min-h-screen bg-[#08090c]" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, ready } = useApp();
  if (!ready) return <div className="min-h-screen bg-[#08090c]" />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const location = useLocation();
  // Process the Emergent OAuth callback FIRST (fragment is not reactive elsewhere)
  if (location.hash?.includes('session_id=')) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/log-trade" element={<LogTrade />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/strategies" element={<Strategies />} />
        <Route path="/ai-insights" element={<ComingSoon />} />
        <Route path="/vision-board" element={<ComingSoon />} />
        <Route path="/zen-zone" element={<ComingSoon />} />
        <Route path="/milestones" element={<Milestones />} />
        <Route path="/backtest" element={<ComingSoon />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <AppProvider>
        <Toaster position="bottom-right" theme="dark" toastOptions={{ style: { background: '#101216', border: '1px solid rgba(255,255,255,0.1)', color: '#e7e9ee' } }} />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </div>
  );
}

export default App;
