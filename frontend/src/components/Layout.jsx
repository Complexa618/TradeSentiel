import React, { useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AddTradeModal from './AddTradeModal';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const location = useLocation();

  const openAddTrade = useCallback(() => { setEditing(null); setAddOpen(true); }, []);
  const openEditTrade = useCallback((trade) => { setEditing(trade); setAddOpen(true); }, []);
  const closeModal = useCallback(() => { setAddOpen(false); setTimeout(() => setEditing(null), 200); }, []);

  return (
    <div className="min-h-screen flex bg-[#08090c] text-gray-200">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar onToggleSidebar={() => setSidebarOpen((s) => !s)} onAddTrade={openAddTrade} />
        <main className="flex-1 overflow-x-hidden">
          <div key={location.pathname} className="page-enter">
            <Outlet context={{ openAddTrade, openEditTrade }} />
          </div>
        </main>
      </div>
      <AddTradeModal open={addOpen} onClose={closeModal} trade={editing} />
    </div>
  );
}
