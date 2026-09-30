'use client';

import React from 'react';
import TicketList from '@/components/features/tickets/TicketList';
import { usePathname } from 'next/navigation';

export default function TriageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isRoot = pathname === '/team/triage';

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 relative">
      {/* List View */}
      <div className={`${isRoot ? 'w-full' : 'hidden md:block'} md:w-1/3 lg:w-1/4 h-full`}>
        <TicketList />
      </div>

      {/* Detail View */}
      <div className={`${isRoot ? 'hidden md:flex' : 'flex'} w-full md:flex-1 h-full`}>
        {children}
      </div>
    </div>
  );
}
