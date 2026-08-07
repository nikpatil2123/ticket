'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/api-client';
import { Loader2, Ticket, CheckCircle2, Clock, Inbox, AlertCircle, Archive } from 'lucide-react';

export default function AnalyticsDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await apiClient.get(`/tickets/stats?${params.toString()}`);
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to load stats', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !stats) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
  }

  if (!stats) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of ticketing statistics across all departments.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <input 
            type="date" 
            className="text-sm border-0 focus:ring-0 p-1 text-slate-700" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Start Date"
          />
          <span className="text-slate-400 text-sm">to</span>
          <input 
            type="date" 
            className="text-sm border-0 focus:ring-0 p-1 text-slate-700" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="End Date"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Tickets */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <Ticket className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Tickets</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.TOTAL}</h3>
          </div>
        </div>

        {/* New / Unassigned */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Inbox className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">New (Unassigned)</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.NEW}</h3>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">In Progress (Open)</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.IN_PROGRESS + stats.OPEN}</h3>
          </div>
        </div>

        {/* Pending Customer */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Pending Customer</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.PENDING_CUSTOMER}</h3>
          </div>
        </div>

        {/* Resolved */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Resolved</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.RESOLVED}</h3>
          </div>
        </div>

        {/* Closed */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <Archive className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Closed</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.CLOSED}</h3>
          </div>
        </div>
      </div>
      
      {/* Visual Progress Bar */}
      {stats.TOTAL > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Ticket Status Distribution</h3>
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div style={{ width: `${(stats.NEW / stats.TOTAL) * 100}%` }} className="bg-blue-500 h-full" title={`New: ${stats.NEW}`}></div>
            <div style={{ width: `${((stats.OPEN + stats.IN_PROGRESS) / stats.TOTAL) * 100}%` }} className="bg-amber-500 h-full" title={`In Progress: ${stats.OPEN + stats.IN_PROGRESS}`}></div>
            <div style={{ width: `${(stats.PENDING_CUSTOMER / stats.TOTAL) * 100}%` }} className="bg-purple-500 h-full" title={`Pending: ${stats.PENDING_CUSTOMER}`}></div>
            <div style={{ width: `${(stats.RESOLVED / stats.TOTAL) * 100}%` }} className="bg-emerald-500 h-full" title={`Resolved: ${stats.RESOLVED}`}></div>
            <div style={{ width: `${(stats.CLOSED / stats.TOTAL) * 100}%` }} className="bg-slate-400 h-full" title={`Closed: ${stats.CLOSED}`}></div>
          </div>
          <div className="flex flex-wrap gap-4 mt-4 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500"></span>New</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500"></span>In Progress</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500"></span>Pending Customer</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span>Resolved</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-400"></span>Closed</div>
          </div>
        </div>
      )}
    </div>
  );
}
