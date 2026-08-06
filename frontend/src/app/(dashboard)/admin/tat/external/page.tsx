'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/api-client';
import { Loader2, Save, Clock } from 'lucide-react';
import TicketList from '@/components/features/tickets/TicketList';

export default function ExternalTATPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    responseHours: 8,
    resolutionHours: 48
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/settings/tat_external');
      if (res.data?.data) {
        setSettings(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load External TAT settings', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await apiClient.put('/settings/tat_external', settings);
      alert('External TAT Rules saved successfully!');
    } catch (err: any) {
      alert(`Failed to save rules: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-red-600" />
            External TAT
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure SLA rules for external users (students, applicants).</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">First Response Time (Hours)</label>
            <div className="relative">
              <input 
                type="number" 
                min="1"
                value={settings.responseHours}
                onChange={(e) => setSettings({ ...settings, responseHours: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
              />
              <span className="absolute right-4 top-2.5 text-xs font-semibold text-slate-400">HRS</span>
            </div>
            <p className="text-[11px] text-slate-500">Time allowed before the first reply is sent.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Resolution Time (Hours)</label>
            <div className="relative">
              <input 
                type="number" 
                min="1"
                value={settings.resolutionHours}
                onChange={(e) => setSettings({ ...settings, resolutionHours: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
              />
              <span className="absolute right-4 top-2.5 text-xs font-semibold text-slate-400">HRS</span>
            </div>
            <p className="text-[11px] text-slate-500">Time allowed to completely resolve the ticket.</p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-bold text-slate-900 mb-4">External TAT Tickets</h3>
        <div className="h-[600px]">
          <TicketList tatType="EXTERNAL" />
        </div>
      </div>
    </div>
  );
}
