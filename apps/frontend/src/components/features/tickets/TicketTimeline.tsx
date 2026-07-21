'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';

export default function TicketTimeline({ ticketId }: { ticketId: string }) {
  const [reply, setReply] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: ticketData, isLoading: isTicketLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const response = await apiClient.get(`/tickets/${ticketId}`);
      return response.data.data;
    },
    enabled: !!ticketId,
    refetchInterval: 5000,
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

  const closeTicketMutation = useMutation({
    mutationFn: async () => {
      await apiClient.put(`/tickets/${ticketId}/status`, { status: 'CLOSED', resolutionNote: 'Closed by agent' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId, 'timeline'] });
    },
    onError: (err: any) => {
      alert(`Failed to close ticket: ${err.message}`);
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
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{ticketData.subject}</p>
        </div>
        <div className="flex gap-2">
          {ticketData.status !== 'CLOSED' && (
            <button 
              onClick={() => { if(confirm('Are you sure you want to close this ticket?')) closeTicketMutation.mutate(); }}
              disabled={closeTicketMutation.isPending}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
            >
              {closeTicketMutation.isPending ? 'Closing...' : 'Close Ticket'}
            </button>
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
              </div>
            );
          }
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Editor */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <textarea
          className="w-full min-h-[80px] p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 shadow-2xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none"
          placeholder="Type your reply here..."
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          disabled={sendReplyMutation.isPending}
        />
        <div className="flex justify-between items-center mt-2.5">
          <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors">
            <Paperclip className="h-4 w-4" />
          </button>
          <button 
            onClick={() => {
              if (reply.trim()) sendReplyMutation.mutate(reply);
            }}
            disabled={!reply.trim() || sendReplyMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {sendReplyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} 
            Send Reply
          </button>
        </div>
      </div>
    </div>
  );
}
