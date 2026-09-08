'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/api-client';

export default function LoginPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/send-otp', { email });
      setMessage(res.data.message || 'OTP sent successfully.');
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/verify-otp', { email, otp });
      const data = res.data;
      
      // Token is now set securely via HttpOnly cookie by the backend.
      // We only store non-sensitive user metadata in localStorage.
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect based on role
      if (data.user.role === 'ADMIN') {
        router.push('/admin/automation'); // or /admin/team
      } else {
        router.push('/team/triage');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white text-slate-900 p-8 rounded-xl border border-slate-200 shadow-lg max-w-sm w-full mx-auto">
      <div className="text-center mb-6">
        <div className="h-10 w-10 rounded-lg bg-red-800 mx-auto flex items-center justify-center font-bold text-white text-sm tracking-wider shadow-sm mb-3">
          PU
        </div>
        <h1 className="text-lg font-bold text-slate-900">Parul University</h1>
        <p className="text-xs text-slate-500 font-medium">Ticketing System</p>
      </div>

      {step === 1 ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          {error && <div className="text-red-700 text-xs font-semibold bg-red-50 border border-red-200 p-2.5 rounded-md text-center">{error}</div>}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 shadow-2xs"
              placeholder="agent@paruluniversity.ac.in"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 py-2 w-full mt-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          {message && <div className="text-green-700 text-xs font-semibold bg-green-50 border border-green-200 p-2.5 rounded-md text-center">{message}</div>}
          {error && <div className="text-red-700 text-xs font-semibold bg-red-50 border border-red-200 p-2.5 rounded-md text-center">{error}</div>}
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Enter OTP</label>
            <input 
              type="text" 
              required 
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 shadow-2xs tracking-widest text-center text-lg"
              placeholder="123456"
              maxLength={6}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || otp.length < 6}
            className="inline-flex items-center justify-center rounded-md text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 py-2 w-full mt-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Login'}
          </button>
          
          <button 
            type="button" 
            onClick={() => setStep(1)}
            className="inline-flex items-center justify-center text-xs font-semibold text-slate-500 hover:text-slate-900 w-full transition-colors cursor-pointer"
          >
            Back to email
          </button>
        </form>
      )}
    </div>
  );
}
