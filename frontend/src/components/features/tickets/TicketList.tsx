'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, Check, Star } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';

const STATUS_OPTIONS = [
  { label: 'New', value: 'NEW' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Pending Customer', value: 'PENDING_CUSTOMER' },
  { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
  { label: 'Pending Document Clarification', value: 'PENDING_DOCUMENT_CLARIFICATION' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'Other', value: 'OTHER' },
];

export default function TicketList({ tatType }: { tatType?: 'INTERNAL' | 'EXTERNAL' } = {}) {
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [subDepartmentFilter, setSubDepartmentFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string[]>(['OPEN']);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setIsStatusOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', tatType, departmentFilter, subDepartmentFilter, statusFilter, searchQuery],
    queryFn: async () => {
      const response = await apiClient.get('/tickets', { 
        params: { 
          tatType, 
          departmentId: departmentFilter || undefined,
          subDepartmentId: subDepartmentFilter || undefined,
          status: statusFilter.length > 0 ? statusFilter.join(',') : undefined,
          search: searchQuery || undefined,
        } 
      });
      return response.data.data;
    },
    refetchInterval: 5000,
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await apiClient.get('/departments');
      return response.data.data;
    },
  });

  const { data: subDepartments } = useQuery({
    queryKey: ['subDepartments', departmentFilter],
    queryFn: async () => {
      const response = await apiClient.get('/sub-departments', {
        params: { departmentId: departmentFilter || undefined }
      });
      return response.data.data;
    },
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
            {tatType ? `${tatType.charAt(0) + tatType.slice(1).toLowerCase()} TAT Queue` : 'My Queue'}
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
        <div className="relative flex flex-col gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 pl-9 text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="relative" ref={statusRef}>
              <button 
                onClick={() => setIsStatusOpen(!isStatusOpen)}
                className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <span className="truncate">
                  {statusFilter.length === 0 ? 'All Statuses' : statusFilter.map(val => STATUS_OPTIONS.find(o => o.value === val)?.label || val).join(', ')}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0 ml-1" />
              </button>
              {isStatusOpen && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-xs shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  {STATUS_OPTIONS.map(opt => (
                     <div 
                       key={opt.value}
                       onClick={() => {
                          if (statusFilter.includes(opt.value)) {
                             setStatusFilter(statusFilter.filter(s => s !== opt.value));
                          } else {
                             setStatusFilter([...statusFilter, opt.value]);
                          }
                       }}
                       className="relative cursor-pointer select-none py-1.5 pl-8 pr-4 hover:bg-slate-100 text-slate-900"
                     >
                       <span className={`block truncate ${statusFilter.includes(opt.value) ? 'font-medium' : 'font-normal'}`}>{opt.label}</span>
                       {statusFilter.includes(opt.value) && (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-blue-600">
                            <Check className="h-3 w-3" />
                          </span>
                       )}
                     </div>
                  ))}
                </div>
              )}
            </div>
            <select 
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setSubDepartmentFilter(''); // Reset sub-department when department changes
              }}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-400 truncate"
            >
              <option value="">All Depts</option>
              {departments?.map((dept: any) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <select 
              value={subDepartmentFilter}
              onChange={(e) => setSubDepartmentFilter(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-400 truncate"
            >
              <option value="">All Sub-Depts</option>
              <option value="UNASSIGNED">Unassigned</option>
              {subDepartments?.map((sub: any) => (
                <option key={sub._id} value={sub._id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
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
              scroll={false}
              className={`block p-3 rounded-lg border transition-colors group shadow-2xs ${
                ticket.hasUnreadReply
                  ? 'border-blue-400 bg-blue-50 hover:bg-blue-100'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-xs flex items-center gap-1.5 group-hover:text-blue-800 ${
                  ticket.hasUnreadReply ? 'font-bold text-blue-700' : 'font-medium text-slate-500'
                }`}>
                  {ticket.hasUnreadReply && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="New Reply" />}
                  T-{ticket._id.substring(ticket._id.length - 4)}
                  {ticket.isFlagged && <span title="Flagged Ticket"><Star className="w-3.5 h-3.5 text-red-500 fill-red-500 ml-1" /></span>}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className={`text-xs truncate mb-2 ${
                ticket.hasUnreadReply ? 'font-bold text-slate-900' : 'font-normal text-slate-600'
              }`}>
                {ticket.subject || '(No Subject)'}
              </h3>
              <div className="flex justify-between items-start text-[11px] gap-2">
                <span className="text-slate-500 truncate font-normal flex-shrink">{ticket.customerEmail}</span>
                <div className="flex flex-wrap justify-end gap-1.5 flex-shrink-0 max-w-[65%]">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${
                    ticket.status === 'CLOSED'
                      ? 'bg-slate-100 text-slate-600 border border-slate-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {ticket.status}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[10px] truncate max-w-[90px]">
                    {ticket.departmentId?.name || ticket.aiClassification?.intent || 'UNASSIGNED'}
                  </span>
                  {ticket.subDepartmentId?.name && (
                    <span className="px-1.5 py-0.5 rounded border font-semibold text-[10px] bg-slate-50 text-slate-700 border-slate-200 truncate max-w-[90px]" title={ticket.subDepartmentId.name}>
                      {ticket.subDepartmentId.name}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
