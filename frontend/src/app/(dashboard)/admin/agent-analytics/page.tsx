'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/api-client';
import { Loader2, Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function AgentAnalyticsPage() {
  const [stats, setStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [internalHrs, setInternalHrs] = useState(24);
  const [externalHrs, setExternalHrs] = useState(48);
  const [businessHours, setBusinessHours] = useState({ start: '09:00', end: '17:00', weekends: false });

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const [statsRes, internalRes, externalRes, businessRes] = await Promise.all([
        apiClient.get(`/tickets/agent-stats?${params.toString()}`),
        apiClient.get('/settings/tat_internal').catch(() => null),
        apiClient.get('/settings/tat_external').catch(() => null),
        apiClient.get('/settings/tat_business_hours').catch(() => null)
      ]);

      setStats(statsRes.data.data);
      if (internalRes?.data?.data?.resolutionHours) setInternalHrs(internalRes.data.data.resolutionHours);
      if (externalRes?.data?.data?.resolutionHours) setExternalHrs(externalRes.data.data.resolutionHours);
      if (businessRes?.data?.data) {
        setBusinessHours({
          start: businessRes.data.data.businessHoursStart || '09:00',
          end: businessRes.data.data.businessHoursEnd || '17:00',
          weekends: !!businessRes.data.data.includeWeekends
        });
      }
    } catch (err: any) {
      console.error('Failed to load agent stats', err);
      setError(err.response?.data?.message || err.message || 'Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  if (isLoading && stats.length === 0 && !error) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500 font-medium">{error}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agent Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Track individual agent performance and SLA compliance.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
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
          
          <div className="flex items-center gap-3 text-xs bg-blue-50 text-blue-800 px-3 py-2 rounded-lg border border-blue-200 shadow-sm">
            <div className="font-semibold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> SLA Limits:</div>
            <div className="px-2 border-l border-blue-300">Internal: {internalHrs}h</div>
            <div className="px-2 border-l border-blue-300">External: {externalHrs}h</div>
            <div className="px-2 border-l border-blue-300">
              Clock: {businessHours.start} - {businessHours.end} ({businessHours.weekends ? 'Mon-Sun' : 'Mon-Fri'})
            </div>
          </div>
        </div>
      </div>

      {stats.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No Data Available</h3>
          <p className="text-slate-500 mt-1">No closed or resolved tickets found for any agents.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-900">Agent</th>
                <th className="px-6 py-4 font-semibold text-slate-900 text-center">Total Closed</th>
                <th className="px-6 py-4 font-semibold text-slate-900 text-center">Avg Time to Close</th>
                <th className="px-6 py-4 font-semibold text-slate-900 text-center">Internal SLA Met (≤{internalHrs}h)</th>
                <th className="px-6 py-4 font-semibold text-slate-900 text-center">External SLA Met (≤{externalHrs}h)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.map((agentStat, index) => (
                <tr 
                  key={agentStat._id || index} 
                  onClick={() => window.location.href = `/admin/agent-analytics/${agentStat._id}`}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs">
                        {agentStat.agentName ? agentStat.agentName.charAt(0) : '?'}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{agentStat.agentName || 'Unknown Agent'}</div>
                        <div className="text-xs text-slate-500">{agentStat.agentEmail || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      {agentStat.closedCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                      <Clock className="w-4 h-4 text-amber-500" />
                      {formatDuration(agentStat.avgCloseTimeMs)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {agentStat.withinInternalSLA} tickets
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {agentStat.withinExternalSLA} tickets
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
