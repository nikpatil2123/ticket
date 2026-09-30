'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/api-client';
import { Loader2, MessageSquare, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

export default function FeedbackTrackerPage() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/feedback');
      setFeedbacks(res.data.data);
    } catch (err: any) {
      console.error('Failed to load feedback data', err);
      setError(err.response?.data?.message || err.message || 'Failed to load feedback requests');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && feedbacks.length === 0 && !error) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500 font-medium">{error}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Feedback Tracker</h1>
          <p className="text-sm text-slate-500 mt-1">Track all sent customer feedback review links.</p>
        </div>
        <button 
          onClick={fetchFeedbacks}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {feedbacks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No Feedback Links Sent</h3>
          <p className="text-slate-500 mt-1">Resolve a ticket to automatically generate and send a feedback link.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-900">Ticket Number</th>
                  <th className="px-6 py-4 font-semibold text-slate-900">Customer</th>
                  <th className="px-6 py-4 font-semibold text-slate-900">Agent</th>
                  <th className="px-6 py-4 font-semibold text-slate-900 text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-slate-900">Customer Rating & Comment</th>
                  <th className="px-6 py-4 font-semibold text-slate-900">Sent Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {feedbacks.map((f, i) => (
                  <tr key={f._id || i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {f.ticketNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {f.customerEmail}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-medium">{f.agentName || 'System'}</div>
                      <div className="text-xs text-slate-500">{f.agentEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {f.isUsed ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <CheckCircle className="w-3.5 h-3.5" /> Completed
                        </span>
                      ) : (
                        new Date() > new Date(f.expiresAt) ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                            <AlertTriangle className="w-3.5 h-3.5" /> Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {f.isUsed && f.rating ? (
                        <div>
                          <div className="text-yellow-500 font-bold text-lg">
                            {f.rating.toFixed(1)} ★
                          </div>
                          {f.comment && (
                            <div className="text-xs text-slate-500 italic mt-0.5 truncate max-w-[200px]" title={f.comment}>
                              "{f.comment}"
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(f.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
