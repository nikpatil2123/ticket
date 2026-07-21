'use client';

import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/api-client';

export default function TicketTrackerPage() {
  const [ticketNumber, setTicketNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketNumber.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const cleanNum = ticketNumber.trim();
      const res = await apiClient.get(`/tickets/track/${cleanNum}`);
      setResult(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Ticket not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ticket Number Tracker</h1>
        <p className="text-muted-foreground mt-1">Track any ticket in real time by entering its unique ticket number.</p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleTrack} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input 
            type="text"
            required
            placeholder="Enter Ticket Number (e.g. TKT-1784610284528)..."
            value={ticketNumber}
            onChange={(e) => setTicketNumber(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg shadow-sm text-base bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button 
          type="submit"
          disabled={loading || !ticketNumber.trim()}
          className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Track Ticket'}
        </button>
      </form>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-6 bg-card border rounded-xl p-6 shadow-sm">
          {/* Ticket Summary Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-primary">{result.ticket.ticketNumber}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  result.ticket.status === 'CLOSED' 
                    ? 'bg-gray-100 text-gray-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {result.ticket.status}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  Priority {result.ticket.priority}
                </span>
              </div>
              <p className="text-lg font-semibold">{result.ticket.subject}</p>
              <p className="text-sm text-muted-foreground mt-1">Customer: <span className="font-medium text-foreground">{result.ticket.customerEmail}</span></p>
            </div>

            <div className="bg-muted p-3 rounded-lg border text-xs space-y-1">
              <div><span className="font-semibold">Assigned Department:</span> {result.ticket.departmentId?.name || 'Unassigned'}</div>
              <div><span className="font-semibold">Created At:</span> {new Date(result.ticket.createdAt).toLocaleString()}</div>
              <div><span className="font-semibold">AI Intent:</span> {result.ticket.aiClassification?.intent || 'MIS'}</div>
            </div>
          </div>

          {/* AI Tags */}
          {result.ticket.aiClassification?.tags?.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">AI Classification Tags:</span>
              {result.ticket.aiClassification.tags.map((tag: string) => (
                <span key={tag} className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Activity & Message Timeline */}
          <div>
            <h3 className="text-md font-bold mb-4">Ticket Audit & Timeline History</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto border rounded-lg p-4 bg-muted/20">
              {result.timeline?.map((item: any) => {
                if (item.type === 'ACTIVITY') {
                  const data = item.data;
                  return (
                    <div key={data._id} className="text-center">
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full border">
                        {new Date(data.createdAt).toLocaleTimeString()} - {data.action} {data.note ? `(${data.note})` : ''}
                      </span>
                    </div>
                  );
                } else {
                  const data = item.data;
                  return (
                    <div key={data._id} className={`flex flex-col max-w-[85%] border rounded-lg p-4 shadow-sm ${
                      data.direction === 'INBOUND' ? 'bg-background' : 'bg-primary/5 border-primary/20 self-end ml-auto'
                    }`}>
                      <div className="flex justify-between items-center mb-2 gap-4">
                        <span className="font-semibold text-xs">{data.from}</span>
                        <span className="text-xs text-muted-foreground">{new Date(data.receivedAt || data.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{data.bodyText || data.bodyHtml}</p>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
