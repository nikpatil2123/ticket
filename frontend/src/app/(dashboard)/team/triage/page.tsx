import React from 'react';

export default function TriagePage() {
  return (
    <div className="flex-1 w-full h-full flex items-center justify-center bg-card rounded-xl border border-dashed">
      <div className="text-center">
        <h3 className="text-lg font-medium text-muted-foreground">Select a ticket</h3>
        <p className="text-sm text-muted-foreground/70 mt-1">Choose a ticket from the queue to view its timeline.</p>
      </div>
    </div>
  );
}
