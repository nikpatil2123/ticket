'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/api-client';
import { Loader2, Save, Settings } from 'lucide-react';

export default function TATSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    businessHoursStart: '09:00',
    businessHoursEnd: '17:00',
    includeWeekends: false
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/settings/tat_business_hours');
      if (res.data?.data) {
        setSettings(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load TAT Business Hours settings', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await apiClient.put('/settings/tat_business_hours', settings);
      alert('TAT Settings saved successfully!');
    } catch (err: any) {
      alert(`Failed to save settings: ${err.response?.data?.message || err.message}`);
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
            <Settings className="w-6 h-6 text-red-600" />
            Global TAT Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure global business hours for SLA calculations.</p>
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
            <label className="text-sm font-medium text-slate-700">Business Hours Start</label>
            <div className="relative">
              <input 
                type="time" 
                value={settings.businessHoursStart}
                onChange={(e) => setSettings({ ...settings, businessHoursStart: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500">When does the SLA clock start ticking each day?</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Business Hours End</label>
            <div className="relative">
              <input 
                type="time" 
                value={settings.businessHoursEnd}
                onChange={(e) => setSettings({ ...settings, businessHoursEnd: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500">When does the SLA clock pause for the day?</p>
          </div>
          
          <div className="space-y-2 col-span-full">
            <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input 
                type="checkbox" 
                checked={settings.includeWeekends}
                onChange={(e) => setSettings({ ...settings, includeWeekends: e.target.checked })}
                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-700">Include Weekends in SLA</p>
                <p className="text-[11px] text-slate-500">If checked, the SLA clock will continue to count down on Saturdays and Sundays.</p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
