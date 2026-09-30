'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Loader2, Star } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';

export default function TicketTimeline({ ticketId }: { ticketId: string }) {
  const [reply, setReply] = useState('');
  const [toEmails, setToEmails] = useState('');
  const [ccEmails, setCcEmails] = useState('');
  const [replyType, setReplyType] = useState<'REPLY_ALL' | 'REPLY'>('REPLY_ALL');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUpdateCountModalOpen, setIsUpdateCountModalOpen] = useState(false);
  const [newRequestCount, setNewRequestCount] = useState(1);
  const [updateReason, setUpdateReason] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setIsAdmin(user.role === 'ADMIN' || user.roleId?.name === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.roleId?.name === 'SUPER_ADMIN');
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

  const { data: subDepartments } = useQuery({
    queryKey: ['sub-departments', ticketData?.departmentId?._id],
    queryFn: async () => {
      if (!ticketData?.departmentId?._id) return [];
      const response = await apiClient.get(`/sub-departments?departmentId=${ticketData.departmentId._id}`);
      return response.data.data;
    },
    enabled: !!ticketData?.departmentId?._id,
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
      
      const inboundMessages = timelineData.filter((item: any) => item.type === 'MESSAGE' && item.data.direction === 'INBOUND');
      if (inboundMessages.length > 0) {
        const latestInbound = inboundMessages[inboundMessages.length - 1].data;
        const sender = latestInbound.from;
        
        setToEmails(sender); // Both Reply and Reply All go to the sender of the last email
        
        if (replyType === 'REPLY_ALL') {
          // Combine original 'to' and 'cc' from the incoming message, filter out our own support email
          const originalTo = latestInbound.to || [];
          const originalCc = latestInbound.cc || [];
          const ticketCustomer = ticketData ? ticketData.customerEmail : null;
          
          let allOtherParticipants = [...originalTo, ...originalCc];
          // Always ensure the main person who created the ticket is included in Reply All
          if (ticketCustomer && ticketCustomer !== sender) {
            allOtherParticipants.push(ticketCustomer);
          }
          
          allOtherParticipants = allOtherParticipants.filter((email: string) => !email.includes('support@acme.com') && email !== sender);
          
          setCcEmails(Array.from(new Set(allOtherParticipants)).join(', '));
        } else {
          setCcEmails('');
        }
      } else {
        // Fallback if no inbound messages (e.g. ticket created manually)
        if (ticketData) {
          setToEmails(ticketData.customerEmail);
        }
        setCcEmails('');
      }
    }
  }, [timelineData, replyType, ticketData]);

  const sendReplyMutation = useMutation({
    mutationFn: async ({ bodyText, cc, to }: { bodyText: string, cc?: string[], to?: string[] }) => {
      await apiClient.post(`/tickets/${ticketId}/messages`, { bodyText, cc, to });
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

  const assignSubDepartmentMutation = useMutation({
    mutationFn: async (subDepartmentId: string) => {
      await apiClient.put(`/tickets/${ticketId}/sub-department`, { subDepartmentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId, 'timeline'] });
    },
    onError: (err: any) => {
      alert(`Failed to assign sub-department: ${err.response?.data?.message || err.message}`);
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

  const updateRequestCountMutation = useMutation({
    mutationFn: async ({ count, reason }: { count: number, reason: string }) => {
      await apiClient.put(`/tickets/${ticketId}/request-count`, { requestCount: count, reason });
    },
    onSuccess: () => {
      setIsUpdateCountModalOpen(false);
      setUpdateReason('');
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId, 'timeline'] });
    },
    onError: (err: any) => {
      alert(`Failed to update request count: ${err.response?.data?.message || err.message}`);
    }
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async (priority: string) => {
      const res = await apiClient.put(`/tickets/${ticketId}/priority`, { priority });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId, 'timeline'] });
    },
    onError: (err: any) => {
      alert(`Failed to update priority: ${err.response?.data?.message || err.message}`);
    }
  });

  const toggleFlagMutation = useMutation({
    mutationFn: async (isFlagged: boolean) => {
      const res = await apiClient.put(`/tickets/${ticketId}/flag`, { isFlagged });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] }); // invalidate ticket list
    },
    onError: (err: any) => {
      alert(`Failed to update flag: ${err.response?.data?.message || err.message}`);
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
            <button
              onClick={() => toggleFlagMutation.mutate(!ticketData.isFlagged)}
              className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
              title={ticketData.isFlagged ? "Unflag ticket" : "Flag ticket"}
              disabled={toggleFlagMutation.isPending}
            >
              <Star
                className={`w-5 h-5 transition-colors ${
                  ticketData.isFlagged
                    ? 'text-red-500 fill-red-500'
                    : 'text-slate-300 hover:text-slate-400'
                }`}
              />
            </button>
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
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-slate-500">{ticketData.subject}</p>
            {ticketData.requestCount > 1 && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Multi-Request Ticket
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-end">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1.5 rounded-md shadow-2xs">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Requests:</span>
            <span className="text-xs font-bold text-slate-900">{ticketData.requestCount || 1}</span>
            {isAdmin && ticketData.status !== 'CLOSED' && (
              <button 
                onClick={() => {
                  setNewRequestCount(ticketData.requestCount || 1);
                  setIsUpdateCountModalOpen(true);
                }}
                className="ml-1 text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Edit
              </button>
            )}
          </div>
          {isAdmin && departments && (
            <select
              className="px-2 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 shadow-2xs"
              onChange={(e) => {
                if(e.target.value) {
                  assignDepartmentMutation.mutate(e.target.value);
                }
              }}
              value={ticketData.departmentId?._id || ""}
              disabled={assignDepartmentMutation.isPending || ticketData.status === 'CLOSED'}
            >
              <option value="" disabled>Assign Department...</option>
              {departments.map((dept: any) => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
          )}
          {isAdmin && subDepartments && ticketData.departmentId && (
            <select
              className="px-2 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 shadow-2xs"
              onChange={(e) => {
                if(e.target.value) {
                  assignSubDepartmentMutation.mutate(e.target.value);
                }
              }}
              value={ticketData.subDepartmentId?._id || ticketData.subDepartmentId || ""}
              disabled={assignSubDepartmentMutation.isPending || ticketData.status === 'CLOSED' || subDepartments.length === 0}
            >
              <option value="" disabled>{subDepartments.length === 0 ? 'No Sub-Departments' : 'Assign Sub-Dept...'}</option>
              {subDepartments.map((sub: any) => (
                <option key={sub._id} value={sub._id}>{sub.name}</option>
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
          {isAdmin && (
            <select
              className={`px-2 py-1.5 text-xs font-semibold rounded-md border bg-white shadow-2xs ${
                ticketData.priority === 'P1' ? 'border-red-300 text-red-700' :
                ticketData.priority === 'P2' ? 'border-orange-300 text-orange-700' :
                ticketData.priority === 'P3' ? 'border-yellow-300 text-yellow-700' :
                'border-slate-300 text-slate-700'
              }`}
              onChange={(e) => {
                if (e.target.value) {
                  updatePriorityMutation.mutate(e.target.value);
                }
              }}
              value={ticketData.priority || 'P3'}
              disabled={updatePriorityMutation.isPending || ticketData.status === 'CLOSED'}
            >
              <option value="" disabled>Priority...</option>
              <option value="P1">Priority 1</option>
              <option value="P2">Priority 2</option>
              <option value="P3">Priority 3</option>
              <option value="P4">Priority 4</option>
            </select>
          )}
          {ticketData.status !== 'CLOSED' && (
            <div className="flex items-center gap-2">
              {(() => {
                let firstStatusChangerName = '';
                if (timelineData) {
                  const statusChangeActivity = timelineData.find((item: any) => item.type === 'ACTIVITY' && item.data?.action === 'STATUS_CHANGED' && item.data?.actorId);
                  if (statusChangeActivity) {
                    const actor = statusChangeActivity.data.actorId;
                    firstStatusChangerName = `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email || 'Agent';
                  }
                }
                return firstStatusChangerName ? (
                  <span className="text-[10px] text-slate-500 font-medium">
                    Changed by <span className="font-semibold text-slate-700">{firstStatusChangerName}</span>
                  </span>
                ) : null;
              })()}
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
            </div>
          )}
          <button
            onClick={() => window.open(`/print/${ticketId}`, '_blank')}
            className="px-2 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 shadow-2xs cursor-pointer hover:bg-slate-50 flex items-center gap-1"
            title="Print Ticket Thread"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          </button>
        </div>
      </div>

      {/* Timeline Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {timelineData?.map((item: any) => {
          if (item.type === 'ACTIVITY') {
            const data = item.data;
            if (data.action === 'REQUEST_COUNT_UPDATED') {
              return (
                <div key={data._id} className="flex items-center justify-center my-2">
                  <div className="text-[10px] bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg max-w-sm text-center">
                    <p className="font-semibold text-blue-800 mb-0.5">Request Count Updated: {data.changes.oldRequestCount} → {data.changes.newRequestCount}</p>
                    <p className="text-blue-600 italic">"{data.changes.reason}"</p>
                    <p className="text-[9px] text-blue-400 mt-1">{new Date(data.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              );
            }
            if (data.action === 'PRIORITY_UPDATED') {
              return (
                <div key={data._id} className="flex items-center justify-center my-1">
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
                    {new Date(data.createdAt).toLocaleTimeString()} - Priority changed to {data.changes.newPriority} {data.note ? `(${data.note})` : ''}
                  </span>
                </div>
              );
            }
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
                {data.cc && data.cc.length > 0 && (
                  <div className={`mb-2 text-[10px] font-medium ${isInbound ? 'text-slate-500' : 'text-slate-300'}`}>
                    CC: {data.cc.join(', ')}
                  </div>
                )}
                {data.bodyHtml ? (
                  <div 
                    className="text-xs leading-relaxed prose prose-sm max-w-none prose-p:my-1 overflow-x-auto custom-scrollbar" 
                    dangerouslySetInnerHTML={{ __html: data.bodyHtml }} 
                  />
                ) : (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">{data.bodyText}</p>
                )}
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
        {(ticketData.status !== 'IN_PROGRESS' || !ticketData.tatType || !ticketData.subDepartmentId) && ticketData.status !== 'CLOSED' && (
          <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 font-medium text-center">
            You must change the status to "In Progress", assign a TAT, and select a Sub-Department in order to reply to this ticket.
          </div>
        )}
        <div className="flex gap-4 mb-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer">
            <input 
              type="radio" 
              name="replyType" 
              checked={replyType === 'REPLY_ALL'} 
              onChange={() => setReplyType('REPLY_ALL')}
              className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            Reply All (with CC)
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer">
            <input 
              type="radio" 
              name="replyType" 
              checked={replyType === 'REPLY'} 
              onChange={() => setReplyType('REPLY')}
              className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            Reply (Sender only)
          </label>
        </div>
        <input
          type="text"
          placeholder="To (comma-separated emails)"
          className="w-full mb-2 p-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 shadow-2xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-500"
          value={toEmails}
          onChange={(e) => setToEmails(e.target.value)}
          disabled={sendReplyMutation.isPending || ticketData.status !== 'IN_PROGRESS' || !ticketData.tatType || !ticketData.subDepartmentId}
        />
        <input
          type="text"
          placeholder="CC (comma-separated emails)"
          className="w-full mb-2 p-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 shadow-2xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-500"
          value={ccEmails}
          onChange={(e) => setCcEmails(e.target.value)}
          disabled={sendReplyMutation.isPending || ticketData.status !== 'IN_PROGRESS' || !ticketData.tatType || !ticketData.subDepartmentId}
        />
        <textarea
          className="w-full min-h-[80px] p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 shadow-2xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none disabled:bg-slate-50 disabled:text-slate-500"
          placeholder={(ticketData.status === 'IN_PROGRESS' && ticketData.tatType && ticketData.subDepartmentId) ? "Type your reply here..." : "Status must be 'In Progress', TAT assigned, and Sub-Department assigned to reply"}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          disabled={sendReplyMutation.isPending || ticketData.status !== 'IN_PROGRESS' || !ticketData.tatType || !ticketData.subDepartmentId}
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
            onClick={() => {
              const ccArray = ccEmails ? ccEmails.split(',').map(e => e.trim()).filter(e => e) : [];
              const toArray = toEmails ? toEmails.split(',').map(e => e.trim()).filter(e => e) : [];
              sendReplyMutation.mutate({ bodyText: reply, cc: ccArray, to: toArray });
            }}
            disabled={!reply.trim() || sendReplyMutation.isPending || ticketData.status !== 'IN_PROGRESS' || !ticketData.tatType || !ticketData.subDepartmentId}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800 transition-colors shadow-2xs disabled:opacity-50 disabled:hover:bg-slate-900 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {sendReplyMutation.isPending ? 'Sending...' : 'Send Reply'}
          </button>
        </div>
      </div>

      {/* Update Request Count Modal */}
      {isUpdateCountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Update Request Count</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Request Count</label>
                <input 
                  type="number" 
                  min="1"
                  value={newRequestCount}
                  onChange={(e) => setNewRequestCount(parseInt(e.target.value) || 1)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-1">Previous count: {ticketData.requestCount || 1}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason (Mandatory)</label>
                <textarea 
                  value={updateReason}
                  onChange={(e) => setUpdateReason(e.target.value)}
                  placeholder="e.g. This email contains Salary, Leave, and Attendance requests."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm h-24 resize-none focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setIsUpdateCountModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button 
                onClick={() => updateRequestCountMutation.mutate({ count: newRequestCount, reason: updateReason })}
                disabled={newRequestCount < 1 || !updateReason.trim() || updateRequestCountMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {updateRequestCountMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
