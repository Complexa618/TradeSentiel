import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AddTradeModal from './AddTradeModal';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#08090c] text-gray-200">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar onToggleSidebar={() => setSidebarOpen((s) => !s)} onAddTrade={() => setAddOpen(true)} />
        <main className="flex-1 overflow-x-hidden">
          <Outlet context={{ openAddTrade: () => setAddOpen(true) }} />
        </main>
      </div>
      <AddTradeModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
