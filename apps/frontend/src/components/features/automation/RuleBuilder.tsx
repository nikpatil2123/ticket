'use client';

import React, { useState } from 'react';

export default function RuleBuilder() {
  const [name, setName] = useState('');
  const [eventTrigger, setEventTrigger] = useState('TICKET_CREATED');

  return (
    <div className="bg-card rounded-xl border shadow-sm w-full max-w-4xl mx-auto">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-card-foreground">Create Automation Rule</h2>
        <p className="text-sm text-muted-foreground mt-1">Define conditions and actions to automate ticket workflows.</p>
      </div>

      <div className="p-6 space-y-8">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">1. Triggers</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rule Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. VIP Routing" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">When this event occurs</label>
              <select 
                value={eventTrigger}
                onChange={(e) => setEventTrigger(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="TICKET_CREATED">Ticket Created</option>
                <option value="TICKET_UPDATED">Ticket Updated</option>
                <option value="CUSTOMER_REPLIED">Customer Replied</option>
              </select>
            </div>
          </div>
        </div>

        {/* Conditions Engine UI Placeholder */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">2. Conditions</h3>
          <div className="p-6 border border-dashed rounded-lg bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground mb-4">If all of these conditions are met...</p>
            <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors">
              + Add Condition
            </button>
          </div>
        </div>

        {/* Actions Engine UI Placeholder */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">3. Actions</h3>
          <div className="p-6 border border-dashed rounded-lg bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground mb-4">Perform these actions in order...</p>
            <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors">
              + Add Action
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 border-t bg-muted/20 flex justify-end gap-3">
        <button className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors">Cancel</button>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
          Save Rule
        </button>
      </div>
    </div>
  );
}
