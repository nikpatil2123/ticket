import React from 'react';
import Link from 'next/link';
import RuleList from '@/components/features/automation/RuleList';

export default function AutomationDashboardPage() {
  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      
      {/* Integrations Header */}
      <div className="bg-card rounded-xl border shadow-sm p-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Integrations</h2>
          <p className="text-sm text-muted-foreground mt-1">Connect your central support inbox to ingest emails.</p>
        </div>
        <a 
          href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1'}/auth/google`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
        >
          Connect Google Workspace
        </a>
      </div>

      <RuleList />
    </div>
  );
}
