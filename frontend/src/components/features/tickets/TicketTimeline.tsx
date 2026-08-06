'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';

export default function TicketTimeline({ ticketId }: { ticketId: string }) {
  const [reply, setReply] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setIsAdmin(user.role === 'ADMIN' || user.roleId?.name === 'ADMIN');
    }
  }, []);

  const { data: ticketData, isLoading: isTicketLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const response = await apiClient.get(`/tickets/${ticketId}`);
      return response.data.data;
    },
    enabled: !!ticketId,
    refetchInterval: 5000,
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await apiClient.get('/departments');
      return response.data.data;
    }
  });

  const { data: timelineData, isLoading: isTimelineLoading } = useQuery({
    queryKey: ['ticket', ticketId, 'timeline'],
    queryFn: async () => {
      const response = await apiClient.get(`/tickets/${ticketId}/timeline`);
      return response.data.data;
    },
    enabled: !!ticketId,
    refetchInterval: 5000,
  });

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const response = await apiClient.get('/templates');
      return response.data.data;
    }
  });

  useEffect(() => {
    if (timelineData && timelineData.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [timelineData]);

  const sendReplyMutation = useMutation({
    mutationFn: async (bodyText: string) => {
      await apiClient.post(`/tickets/${ticketId}/messages`, { bodyText });
    },
    onSuccess: () => {
      setReply('');
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId, 'timeline'] });
    },
    onError: (err: any) => {
      alert(`Failed to send reply: ${err.message}`);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      let agentName = 'agent';
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          agentName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'agent';
        }
      } catch (e) {}
      
      const payload: any = { status };
      if (status === 'CLOSED') {
        payload.resolutionNote = `Closed by ${agentName}`;
      }
      
      await apiClient.put(`/tickets/${ticketId}/status`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId, 'timeline'] });
    },
    onError: (err: any) => {
      alert(`Failed to update status: ${err.response?.data?.message || err.message}`);
    }
  });

  const assignDepartmentMutation = useMutation({
    mutationFn: async (departmentId: string) => {
      await apiClient.put(`/tickets/${ticketId}/department`, { departmentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId, 'timeline'] });
    },
    onError: (err: any) => {
      alert(`Failed to assign department: ${err.response?.data?.message || err.message}`);
    }
  });

  const updateTatTypeMutation = useMutation({
    mutationFn: async (tatType: 'INTERNAL' | 'EXTERNAL') => {
      const res = await apiClient.put(`/tickets/${ticketId}/tatType`, { tatType });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-timeline', ticketId] });
    },
    onError: (err: any) => {
      alert(`Failed to update TAT type: ${err.response?.data?.message || err.message}`);
    }
  });

  if (isTicketLoading || isTimelineLoading) {
    return <div className="h-full flex items-center justify-center">Loading ticket details...</div>;
  }

  if (!ticketData) {
    return <div className="h-full flex items-center justify-center text-destructive">Ticket not found.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div>
          <h2 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
            Ticket T-{ticketId.substring(ticketId.length - 4)}
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
              ticketData.status === 'CLOSED' 
                ? 'bg-slate-100 text-slate-600 border-slate-200' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {ticketData.status}
            </span>
            {!ticketData.departmentId && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-red-50 text-red-700 border-red-200">
                UNASSIGNED
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{ticketData.subject}</p>
        </div>
        <div className="flex gap-2 items-center">
          {isAdmin && departments && (
            <select
              className="px-2 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 shadow-2xs"
              onChange={(e) => {
                if(e.target.value) {
                  assignDepartmentMutation.mutate(e.target.value);
                }
              }}
              defaultValue={ticketData.departmentId?._id || ""}
              disabled={assignDepartmentMutation.isPending || ticketData.status === 'CLOSED'}
            >
              <option value="" disabled>Assign Department...</option>
              {departments.map((dept: any) => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
          )}
          {isAdmin && (
            <select
              className="px-2 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 shadow-2xs"
            onChange={(e) => {
              if (e.target.value) {
                updateTatTypeMutation.mutate(e.target.value as 'INTERNAL' | 'EXTERNAL');
              }
            }}
            value={ticketData.tatType || ""}
            disabled={updateTatTypeMutation.isPending || ticketData.status === 'CLOSED'}
          >
            <option value="" disabled>Assign TAT...</option>
              <option value="INTERNAL">Internal TAT</option>
              <option value="EXTERNAL">External TAT</option>
            </select>
          )}
          {ticketData.status !== 'CLOSED' && (
            <select
              className="px-2 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 shadow-2xs cursor-pointer"
              onChange={(e) => {
                if (e.target.value) {
                  if (e.target.value === 'CLOSED') {
                    if(confirm('Are you sure you want to close this ticket?')) {
                      updateStatusMutation.mutate('CLOSED');
                    }
                  } else {
                    updateStatusMutation.mutate(e.target.value);
                  }
                }
              }}
              value={ticketData.status}
              disabled={updateStatusMutation.isPending}
            >
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PENDING_CUSTOMER">Pending Customer</option>
              <option value="PENDING_APPROVAL">Waiting on Approval</option>
              <option value="PENDING_DOCUMENT_CLARIFICATION">Waiting on Documents</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          )}
        </div>
      </div>

      {/* Timeline Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {timelineData?.map((item: any) => {
          if (item.type === 'ACTIVITY') {
            const data = item.data;
            return (
              <div key={data._id} className="flex items-center justify-center my-1">
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
                  {new Date(data.createdAt).toLocaleTimeString()} - {data.action} {data.note ? `(${data.note})` : ''}
                </span>
              </div>
            );
          } else {
            const data = item.data;
            const isInbound = data.direction === 'INBOUND';
            return (
              <div key={data._id} className={`flex flex-col max-w-[80%] rounded-lg p-3.5 shadow-2xs border ${
                isInbound 
                  ? 'bg-white border-slate-200 text-slate-900 self-start' 
                  : 'bg-slate-900 border-slate-900 text-white self-end'
              }`}>
                <div className="flex justify-between items-center mb-1 gap-4">
                  <span className={`font-semibold text-xs ${isInbound ? 'text-slate-800' : 'text-slate-200'}`}>{data.from}</span>
                  <span className={`text-[10px] ${isInbound ? 'text-slate-400' : 'text-slate-400'}`}>
                    {new Date(data.receivedAt || data.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{data.bodyText || data.bodyHtml}</p>
                {data.attachments && data.attachments.length > 0 && (
                  <div className="mt-2 space-y-1.5 border-t border-slate-200/50 pt-2">
                    {data.attachments.map((att: any) => (
                      <a
                        key={att._id}
                        href={att.driveFileLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 text-xs font-medium hover:underline w-fit ${isInbound ? 'text-blue-600' : 'text-blue-400'}`}
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        {att.fileName}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          }
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Editor */}
      <div className="p-4 border-t border-slate-200 bg-white">
        {ticketData.status !== 'IN_PROGRESS' && ticketData.status !== 'CLOSED' && (
          <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 font-medium text-center">
            You must change the status to "In Progress" in order to reply to this ticket.
          </div>
        )}
        <textarea
          className="w-full min-h-[80px] p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 shadow-2xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none disabled:bg-slate-50 disabled:text-slate-500"
          placeholder={ticketData.status === 'IN_PROGRESS' ? "Type your reply here..." : "Status must be 'In Progress' to reply"}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          disabled={sendReplyMutation.isPending || ticketData.status !== 'IN_PROGRESS'}
        />
        <div className="mt-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <p className="text-[10px] text-slate-400 font-medium">Use professional language when replying.</p>
            {ticketData.status === 'IN_PROGRESS' && templates && templates.length > 0 && (
              <select
                className="text-xs bg-slate-100 border border-slate-200 text-slate-600 rounded px-2 py-1 focus:outline-none"
                onChange={(e) => {
                  if (e.target.value) {
                    const selected = templates.find((t: any) => t._id === e.target.value);
                    if (selected) {
                      setReply((prev) => prev ? prev + '\n\n' + selected.bodyText : selected.bodyText);
                    }
                    e.target.value = "";
                  }
                }}
              >
                <option value="">Insert Template...</option>
                {templates.map((t: any) => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={() => sendReplyMutation.mutate(reply)}
            disabled={!reply.trim() || sendReplyMutation.isPending || ticketData.status !== 'IN_PROGRESS'}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800 transition-colors shadow-2xs disabled:opacity-50 disabled:hover:bg-slate-900 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {sendReplyMutation.isPending ? 'Sending...' : 'Send Reply'}
          </button>
        </div>
      </div>
    </div>
  );
}
