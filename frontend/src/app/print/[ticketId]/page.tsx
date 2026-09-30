'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';
import { useParams } from 'next/navigation';

export default function PrintTicketPage() {
  const params = useParams();
  const ticketId = params.ticketId as string;

  const { data: ticketData, isLoading: isTicketLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const response = await apiClient.get(`/tickets/${ticketId}`);
      return response.data.data;
    },
    enabled: !!ticketId,
  });

  const { data: timelineData, isLoading: isTimelineLoading } = useQuery({
    queryKey: ['ticket', ticketId, 'timeline'],
    queryFn: async () => {
      const response = await apiClient.get(`/tickets/${ticketId}/timeline`);
      return response.data.data;
    },
    enabled: !!ticketId,
  });

  const isLoading = isTicketLoading || isTimelineLoading;

  useEffect(() => {
    if (!isLoading && ticketData && timelineData) {
      document.title = ticketData.subject || `Ticket T-${ticketId}`;
      
      // Small delay to ensure images/styles are loaded
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [isLoading, ticketData, timelineData, ticketId]);

  if (isLoading) {
    return <div className="p-8 font-sans text-center">Loading printable view...</div>;
  }

  if (!ticketData) {
    return <div className="p-8 font-sans text-center text-red-600">Ticket not found</div>;
  }

  const messages = timelineData?.filter((item: any) => item.type === 'MESSAGE') || [];
  
  return (
    <div className="max-w-4xl mx-auto p-8 font-sans bg-white text-black print:p-0 print:max-w-full">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 20mm; }
        }
      `}} />
      
      {/* Header (like Gmail) */}
      <div className="flex justify-between items-start border-b border-gray-300 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-normal mb-1">{ticketData.subject}</h1>
          <p className="text-sm text-gray-500">
            {messages.length} message{messages.length !== 1 ? 's' : ''} • Ticket T-{ticketId.substring(ticketId.length - 4)}
          </p>
        </div>
        <div className="text-right text-sm text-gray-500">
          <div className="font-bold text-black mb-1">Parul University Ticketing System</div>
          <div>{ticketData.customerEmail}</div>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-8">
        {messages.map((msg: any, index: number) => {
          const isCustomer = msg.data.direction === 'INBOUND';
          return (
            <div key={msg.data._id || index} className="border-b border-gray-100 pb-6 last:border-0">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <span className="font-bold text-sm">
                    {isCustomer ? ticketData.customerEmail : 'Parul University Support'}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    &lt;{isCustomer ? ticketData.customerEmail : 'support@paruluniversity.ac.in'}&gt;
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleString()}
                </div>
              </div>
              
              <div 
                className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap font-sans"
                dangerouslySetInnerHTML={{ __html: msg.data.bodyHtml || msg.data.bodyText }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
