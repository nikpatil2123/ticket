import React from 'react';
import TicketList from '@/components/features/tickets/TicketList';

export default function TriagePage() {
  return (
    <div className="h-full flex gap-6">
      {/* List View - Always visible */}
      <div className="w-full md:w-1/3 lg:w-1/4 h-full">
        <TicketList />
      </div>

      {/* Detail View - Hidden on mobile unless ticket is selected */}
      <div className="hidden md:flex flex-1 h-full items-center justify-center bg-card rounded-xl border border-dashed">
        <div className="text-center">
          <h3 className="text-lg font-medium text-muted-foreground">Select a ticket</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">Choose a ticket from the queue to view its timeline.</p>
        </div>
      </div>
    </div>
  );
}
