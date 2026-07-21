'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col md:flex-row font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-100 hidden md:flex flex-col p-4 border-r border-slate-800">
        <div className="mb-6 px-2 py-1 flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="h-8 w-8 rounded-lg bg-red-800 flex items-center justify-center font-bold text-white text-sm tracking-widest shadow-sm">
            PU
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">Parul University</h2>
            <p className="text-[11px] text-slate-400 font-medium">Ticketing System</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          <Link href="/team/triage" className="flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md text-slate-200 hover:text-white hover:bg-slate-800 transition-colors">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            Ticket Queue
          </Link>
          
          {user.role === 'ADMIN' && (
            <>
              <div className="pt-5 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Administration
              </div>
              <Link href="/admin/team" className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                Team Management
              </Link>
              <Link href="/admin/departments" className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                Departments
              </Link>
              <Link href="/admin/tracker" className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                Ticket Tracker
              </Link>
              <Link href="/admin/automation" className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                Rule Engine
              </Link>
            </>
          )}
        </nav>
        
        <div className="border-t border-slate-800 pt-3 mt-auto">
          <div onClick={handleLogout} className="px-3 py-2 text-xs font-medium flex items-center gap-2 cursor-pointer text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition-colors">
            Log out
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100">
        {/* Top Header */}
        <header className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white shadow-sm">
          <div className="md:hidden font-bold text-slate-900 text-sm">Parul University Support</div>
          <div className="ml-auto flex items-center gap-3">
            {user.role === 'ADMIN' && (
              <a 
                href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1'}/auth/google`}
                className="text-xs font-semibold px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-md transition-colors shadow-sm flex items-center gap-1.5"
              >
                <span>Connect Google Account</span>
              </a>
            )}
            <span className="text-xs text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-md font-medium">
              Signed in as: <strong className="text-slate-900">{user.firstName} {user.lastName}</strong> ({user.role})
            </span>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-auto bg-slate-100 p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
