'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, MoreVertical, CheckCircle2, XCircle } from 'lucide-react';

const MOCK_RULES = [
  { id: '1', name: 'Auto-Assign Billing', eventTrigger: 'TICKET_CREATED', isActive: true, order: 10 },
  { id: '2', name: 'SLA Breach Escalation', eventTrigger: 'SLA_BREACHED', isActive: true, order: 20 },
  { id: '3', name: 'Spam Auto-Close', eventTrigger: 'TICKET_CREATED', isActive: false, order: 5 },
];

export default function RuleList() {
  return (
    <div className="bg-card rounded-xl border shadow-sm w-full">
      <div className="p-6 border-b flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-card-foreground">Automation Rules</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage deterministic logic applied to incoming events.</p>
        </div>
        <Link href="/admin/automation/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Create Rule
        </Link>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
            <tr>
              <th className="px-6 py-4 font-medium">Order</th>
              <th className="px-6 py-4 font-medium">Rule Name</th>
              <th className="px-6 py-4 font-medium">Event Trigger</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {MOCK_RULES.map((rule) => (
              <tr key={rule.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 text-muted-foreground">{rule.order}</td>
                <td className="px-6 py-4 font-medium">{rule.name}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium">
                    {rule.eventTrigger}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {rule.isActive ? (
                    <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <XCircle className="h-4 w-4" /> Disabled
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-muted-foreground hover:text-foreground p-1">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
