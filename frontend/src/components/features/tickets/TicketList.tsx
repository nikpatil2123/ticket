'use client';

import React from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';

export default function TicketList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      const response = await apiClient.get('/tickets');
      return response.data.data;
    },
    refetchInterval: 5000,
  });
  const queryClient = useQueryClient();
  const syncMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/email/sync');
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    }
  });

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden w-full">
      <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-sm text-slate-800 tracking-tight flex items-center gap-2">
            My Queue
            <span className="text-[11px] font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
              {data?.length || 0}
            </span>
          </h2>
          <button 
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="text-xs font-semibold px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors flex items-center gap-1 disabled:opacity-50 shadow-sm"
          >
            {syncMutation.isPending ? 'Syncing...' : 'Sync Emails'}
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 pl-9 text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading && <div className="p-4 text-xs text-slate-500 text-center">Loading ticket queue...</div>}
        {error && <div className="p-4 text-xs text-red-600 text-center">Failed to load tickets.</div>}
        {!isLoading && !error && data?.length === 0 && (
          <div className="p-4 text-xs text-slate-500 text-center">No active tickets found.</div>
        )}
        
        <div className="space-y-1">
          {data?.map((ticket: any) => (
            <Link 
              key={ticket._id}
              href={`/team/triage/${ticket._id}`} 
              className="block p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors group shadow-2xs"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-blue-700 group-hover:text-blue-800">
                  T-{ticket._id.substring(ticket._id.length - 4)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-xs font-semibold text-slate-800 truncate mb-2">{ticket.subject}</h3>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500 truncate max-w-[130px] font-normal">{ticket.customerEmail}</span>
                <div className="flex gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    ticket.status === 'CLOSED'
                      ? 'bg-slate-100 text-slate-600 border border-slate-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {ticket.status}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-semibold text-[10px]">
                    P{ticket.priority}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
