'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/api-client';
import { Loader2, ArrowLeft, Clock, Calendar, CheckCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AgentDetailedAnalyticsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [agentStats, setAgentStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [internalHrs, setInternalHrs] = useState(24);
  const [externalHrs, setExternalHrs] = useState(48);

  useEffect(() => {
    if (id) {
      fetchDetailedStats();
    }
  }, [id, startDate, endDate]);

  const fetchDetailedStats = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const [statsRes, internalRes, externalRes] = await Promise.all([
        apiClient.get(`/tickets/agent-stats/${id}?${params.toString()}`),
        apiClient.get('/settings/tat_internal').catch(() => null),
        apiClient.get('/settings/tat_external').catch(() => null)
      ]);

      setAgentStats(statsRes.data.data);
      if (internalRes?.data?.data?.resolutionTimeHours) setInternalHrs(internalRes.data.data.resolutionTimeHours);
      if (externalRes?.data?.data?.resolutionTimeHours) setExternalHrs(externalRes.data.data.resolutionTimeHours);
    } catch (err: any) {
      console.error('Failed to load agent detailed stats', err);
      setError(err.response?.data?.message || err.message || 'Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms === null || ms === undefined) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
  }

  if (error || !agentStats) {
    return <div className="p-8 text-center text-red-500 font-medium">{error || 'Agent not found'}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <button 
        onClick={() => router.back()} 
        className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back to Analytics
      </button>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-2xl shadow-sm">
              {agentStats.agentName ? agentStats.agentName.charAt(0) : '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{agentStats.agentName || 'Unknown Agent'}</h1>
              <p className="text-sm text-slate-500">{agentStats.agentEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm w-fit">
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
        <div className="flex gap-4">
          <div className="bg-white rounded-lg border border-slate-200 px-5 py-3 shadow-sm text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Closed</p>
            <p className="text-xl font-bold text-slate-900 flex items-center justify-center gap-1.5">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              {agentStats.closedCount}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 px-5 py-3 shadow-sm text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Avg Time to Close</p>
            <p className="text-xl font-bold text-slate-900 flex items-center justify-center gap-1.5">
              <Clock className="w-5 h-5 text-amber-500" />
              {formatDuration(agentStats.avgCloseTimeMs)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-800">Closed Tickets Log</h2>
        </div>
        
        {agentStats.closedTickets && agentStats.closedTickets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-white border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                <tr>
                  <th className="px-6 py-3">Ticket</th>
                  <th className="px-6 py-3">Subject</th>
                  <th className="px-6 py-3 text-center">TAT Type</th>
                  <th className="px-6 py-3">Creation Time</th>
                  <th className="px-6 py-3">Closing Time</th>
                  <th className="px-6 py-3 text-right">Time Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agentStats.closedTickets.map((ticket: any) => (
                  <tr key={ticket._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-indigo-600">
                      <Link href={`/admin/tracker?search=${ticket.ticketNumber}`} className="hover:underline">
                        {ticket.ticketNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 max-w-[200px] truncate" title={ticket.subject}>{ticket.subject}</div>
                      <div className="text-xs text-slate-500">{ticket.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        ticket.tatType === 'EXTERNAL' ? 'bg-amber-100 text-amber-800' : 
                        ticket.tatType === 'INTERNAL' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {ticket.tatType || 'NONE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(ticket.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-slate-600 flex items-center gap-1.5">
                      {formatDate(ticket.resolvedAt || ticket.updatedAt)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {ticket.tatType === 'INTERNAL' && (
                          ticket.resolutionTimeMs <= internalHrs * 3600000
                            ? <span title="Met SLA" className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            : <span title="Missed SLA" className="w-2 h-2 rounded-full bg-red-500"></span>
                        )}
                        {ticket.tatType === 'EXTERNAL' && (
                          ticket.resolutionTimeMs <= externalHrs * 3600000
                            ? <span title="Met SLA" className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            : <span title="Missed SLA" className="w-2 h-2 rounded-full bg-red-500"></span>
                        )}
                        <span className="text-slate-900">{formatDuration(ticket.resolutionTimeMs)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-slate-900">No closed tickets</h3>
            <p className="text-xs text-slate-500 mt-1">This agent hasn't closed any tickets yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
