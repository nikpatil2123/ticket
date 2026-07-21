import React from 'react';
import TicketList from '@/components/features/tickets/TicketList';
import TicketTimeline from '@/components/features/tickets/TicketTimeline';

export default async function TicketDetailPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  
  return (
    <div className="h-full flex flex-col md:flex-row gap-6 relative">
      {/* Left List View - Hidden on Mobile when ticket is selected */}
      <div className="hidden md:block w-full md:w-1/3 lg:w-1/4 h-full">
        <TicketList />
      </div>

      {/* Right Detail View - Takes full width on mobile */}
      <div className="w-full md:flex-1 h-full">
        <TicketTimeline ticketId={ticketId} />
      </div>
    </div>
  );
}
