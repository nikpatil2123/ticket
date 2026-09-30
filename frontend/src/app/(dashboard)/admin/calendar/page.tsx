'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, Clock, CalendarOff, CalendarCheck, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/api-client';

// Utility for basic date math
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Defaults: 9 AM to 5 PM
  const [defaultStartTime, setDefaultStartTime] = useState('09:00');
  const [defaultEndTime, setDefaultEndTime] = useState('17:00');

  // Track off days as an array of YYYY-MM-DD strings
  const [offDays, setOffDays] = useState<Set<string>>(new Set());

  // Track custom times for specific days: YYYY-MM-DD -> { start, end }
  const [customTimes, setCustomTimes] = useState<Record<string, { start: string, end: string }>>({});

  // Track currently selected date for editing in the sidebar
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Fetch from backend on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/settings/calendar_config');
        if (res.data?.data) {
          const config = res.data.data;
          setDefaultStartTime(config.defaultStartTime || '09:00');
          setDefaultEndTime(config.defaultEndTime || '17:00');
          if (config.offDays) setOffDays(new Set(config.offDays));
          if (config.customTimes) setCustomTimes(config.customTimes);
        }
      } catch (error) {
        console.error('Failed to load calendar config', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const toggleDayStatus = (dateString: string, dayOfWeek: number) => {
    const newOffDays = new Set(offDays);
    if (newOffDays.has(dateString)) {
      newOffDays.delete(dateString);
    } else {
      newOffDays.add(dateString);
    }
    setOffDays(newOffDays);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.put('/settings/calendar_config', {
        defaultStartTime,
        defaultEndTime,
        offDays: Array.from(offDays),
        customTimes
      });
      alert('Calendar Settings Saved!');
    } catch (error) {
      console.error('Failed to save calendar config', error);
      alert('Error saving settings. Check console.');
    } finally {
      setIsSaving(false);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month); // 0 = Sunday, 1 = Monday

  const days = [];
  // Empty slots for days before the 1st of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="p-4 rounded-xl border border-transparent bg-slate-50/50"></div>);
  }

  const handleCustomTimeChange = (dateString: string, field: 'start' | 'end', value: string) => {
    setCustomTimes(prev => ({
      ...prev,
      [dateString]: {
        start: prev[dateString]?.start || defaultStartTime,
        end: prev[dateString]?.end || defaultEndTime,
        [field]: value
      }
    }));
  };

  // Actual days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isOffDay = offDays.has(dateString);
    
    // Automatically suggest Sundays as off days visually if not explicitly set
    const isSunday = date.getDay() === 0;
    const effectiveIsOff = isOffDay || (isSunday && !offDays.has(`!${dateString}`)); // simple hack for demo

    const dayStartTime = customTimes[dateString]?.start || defaultStartTime;
    const dayEndTime = customTimes[dateString]?.end || defaultEndTime;

    const isSelected = selectedDate === dateString;

    days.push(
      <div 
        key={day} 
        onClick={() => setSelectedDate(dateString)}
        className={`relative p-3 rounded-xl border transition-all min-h-[100px] flex flex-col cursor-pointer
          ${isSelected ? 'ring-2 ring-blue-500 shadow-md scale-[1.02] z-10' : 'hover:scale-[1.01] hover:shadow-sm'}
          ${effectiveIsOff 
            ? 'bg-rose-50 border-rose-200 text-rose-700' 
            : 'bg-white border-slate-200'
          }`}
      >
        <div className="flex justify-between items-start mb-2">
          <span className={`font-bold text-lg ${effectiveIsOff ? 'text-rose-700' : 'text-slate-800'}`}>{day}</span>
          {effectiveIsOff ? (
            <CalendarOff className="w-4 h-4 opacity-70 text-rose-500" />
          ) : (
            <CalendarCheck className="w-4 h-4 opacity-30 text-emerald-500" />
          )}
        </div>

        {effectiveIsOff ? (
          <div className="mt-auto flex items-center justify-center bg-rose-100 rounded-md py-1 text-[10px] font-bold uppercase tracking-wider text-rose-600">
            Off Day
          </div>
        ) : (
          <div className="mt-auto pt-1.5 border-t border-slate-100/60">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between bg-slate-50 rounded px-1.5 py-0.5">
                <span className="text-[8px] text-slate-400 font-bold tracking-wider">IN</span>
                <span className="text-right text-slate-700 text-[10px] font-semibold">{dayStartTime}</span>
              </div>
              <div className="flex items-center justify-between bg-slate-50 rounded px-1.5 py-0.5">
                <span className="text-[8px] text-slate-400 font-bold tracking-wider">OUT</span>
                <span className="text-right text-slate-700 text-[10px] font-semibold">{dayEndTime}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Working Calendar</h1>
          <p className="text-sm text-slate-500 mt-1">Configure business hours and mark off-days for SLA & Out-of-Hours tracking.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Configuration
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Settings Sidebar */}
        <div className="col-span-1 space-y-4">
          
          {selectedDate ? (
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 shadow-sm relative overflow-hidden">
              <button 
                onClick={() => setSelectedDate(null)}
                className="absolute top-3 right-3 text-blue-400 hover:text-blue-700 text-xs font-bold px-2 py-1 bg-white rounded-md border border-blue-100 shadow-sm"
              >
                Done
              </button>
              <h2 className="text-sm font-bold text-blue-900 mb-1 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-blue-600" /> Editing Day
              </h2>
              <p className="text-xs font-medium text-blue-700/80 mb-5">{new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              
              <div className="space-y-4">
                <button
                  onClick={() => toggleDayStatus(selectedDate, new Date(selectedDate).getDay())}
                  className={`w-full py-2 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    offDays.has(selectedDate) || (new Date(selectedDate).getDay() === 0 && !offDays.has(`!${selectedDate}`))
                      ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200'
                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200'
                  }`}
                >
                  {offDays.has(selectedDate) || (new Date(selectedDate).getDay() === 0 && !offDays.has(`!${selectedDate}`)) ? (
                    <><CalendarOff className="w-4 h-4" /> Marked as Off Day (Click to Work)</>
                  ) : (
                    <><CalendarCheck className="w-4 h-4" /> Marked as Working Day (Click to Off)</>
                  )}
                </button>

                {!(offDays.has(selectedDate) || (new Date(selectedDate).getDay() === 0 && !offDays.has(`!${selectedDate}`))) && (
                  <div className="bg-white p-4 rounded-lg border border-blue-100 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Custom Start Time</label>
                      <input 
                        type="time" 
                        value={customTimes[selectedDate]?.start || defaultStartTime}
                        onChange={(e) => handleCustomTimeChange(selectedDate, 'start', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Custom End Time</label>
                      <input 
                        type="time" 
                        value={customTimes[selectedDate]?.end || defaultEndTime}
                        onChange={(e) => handleCustomTimeChange(selectedDate, 'end', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Standard Timings
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Global Start Time</label>
                  <input 
                    type="time" 
                    value={defaultStartTime}
                    onChange={(e) => setDefaultStartTime(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Global End Time</label>
                  <input 
                    type="time" 
                    value={defaultEndTime}
                    onChange={(e) => setDefaultEndTime(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs font-medium leading-relaxed mt-2 border border-blue-100">
                  Any ticket activity recorded outside of these hours will be flagged as <strong>Out-of-Hours Work</strong>.
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-900 rounded-xl p-5 shadow-sm text-slate-100">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-2 text-white">How it works</h2>
            <ul className="text-xs space-y-2 text-slate-400">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shrink-0"></span>
                <span>Click any day on the calendar to toggle it between a Working Day and an Off Day.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1 shrink-0"></span>
                <span>Off days do not count towards active SLA hours, and all work done on off days is marked as overtime.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Calendar Main Area */}
        <div className="col-span-1 md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {monthName} <span className="font-light text-slate-500">{year}</span>
            </h2>
            <div className="flex gap-1">
              <button onClick={handlePrevMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={handleNextMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-5">
            <div className="grid grid-cols-7 gap-3 mb-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest py-1">
                  {day}
                </div>
              ))}
            </div>
            
            {loading ? (
              <div className="h-64 flex items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-3">
                {days}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
