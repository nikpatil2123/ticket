import React from 'react';
import TicketTimeline from '@/components/features/tickets/TicketTimeline';

export default async function TicketDetailPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  
  return (
    <div className="w-full h-full flex-1">
      <TicketTimeline ticketId={ticketId} />
    </div>
  );
}
