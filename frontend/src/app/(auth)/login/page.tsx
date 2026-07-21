'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) throw new Error('Invalid credentials');
      
      const data = await res.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect based on role
      if (data.user.role === 'ADMIN') {
        router.push('/admin/automation'); // or /admin/team
      } else {
        router.push('/team/triage');
      }
    } catch (err: any) {
      setError(err.message);
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

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Password</label>
          <input 
            type="password" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 shadow-2xs"
            placeholder="••••••••"
          />
        </div>

        <button 
          type="submit" 
          className="inline-flex items-center justify-center rounded-md text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 py-2 w-full mt-2 shadow-sm transition-colors cursor-pointer"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}
