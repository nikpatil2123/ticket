'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';
import { Trash2, Plus, Loader2 } from 'lucide-react';

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [bodyText, setBodyText] = useState('');

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await apiClient.get('/templates');
      return res.data.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; bodyText: string }) => {
      await apiClient.post('/templates', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setName('');
      setBodyText('');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message);
    }
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Canned Templates</h1>
          <p className="text-slate-500 text-sm mt-1">Manage reusable reply templates for your agents.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
          <h2 className="font-semibold text-slate-800 mb-4">Create Template</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Template Name</label>
              <input
                className="w-full p-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="e.g. Password Reset"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Body Text</label>
              <textarea
                className="w-full p-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 h-32 resize-none"
                placeholder="Hello,\n\nTo reset your password..."
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
              />
            </div>
            <button
              onClick={() => {
                if (!name.trim() || !bodyText.trim()) return alert('Name and body are required.');
                createMutation.mutate({ name, bodyText });
              }}
              disabled={createMutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white p-2 rounded-md font-semibold text-sm hover:bg-slate-800 disabled:opacity-50"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Template
            </button>
          </div>
        </div>

        <div className="md:col-span-2">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Template Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Content Preview</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {templates?.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-sm text-slate-500">No templates found. Create one to get started.</td></tr>
                  ) : templates?.map((template: any) => (
                    <tr key={template._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {template.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                        {template.bodyText}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => { if(confirm('Are you sure?')) deleteMutation.mutate(template._id); }}
                          className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
