import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LogTrade from './pages/LogTrade';
import Calendar from './pages/Calendar';
import Strategies from './pages/Strategies';
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

function App() {
  return (
    <div className="App">
      <AppProvider>
        <BrowserRouter>
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
              <Route path="/milestones" element={<ComingSoon />} />
              <Route path="/backtest" element={<ComingSoon />} />
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </div>
  );
}

export default App;
