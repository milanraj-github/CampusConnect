import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useRobotStore } from '../../store/robotStore';
import { useMapStore } from '../../store/mapStore';

export const Layout: React.FC = () => {
  const { fetchInitialStatus, initSocketListeners } = useRobotStore();
  const { loadActiveMap } = useMapStore();

  useEffect(() => {
    fetchInitialStatus();
    initSocketListeners();
    loadActiveMap();
  }, [fetchInitialStatus, initSocketListeners, loadActiveMap]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
