import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-white text-left w-full max-w-full m-0 p-0" style={{ border: 'none' }}>
      <Sidebar />
      <main className="flex-1 min-w-0 bg-[#fbfbfb] border-l border-[#e5e4e7] -ml-px">
        <div className="p-8 w-full max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
