'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/api-client';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', description: '', supportEmailAlias: '' });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await apiClient.get('/departments');
      setDepartments(res.data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (dept?: any) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({
        name: dept.name,
        description: dept.description || '',
        supportEmailAlias: dept.supportEmailAlias || ''
      });
    } else {
      setEditingDept(null);
      setFormData({ name: '', description: '', supportEmailAlias: '' });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await apiClient.put(`/departments/${editingDept._id}`, formData);
      } else {
        await apiClient.post('/departments', formData);
      }
      setShowModal(false);
      fetchDepartments();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to save department');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await apiClient.delete(`/departments/${id}`);
      fetchDepartments();
    } catch (err: any) {
      alert(err.message || 'Failed to delete department');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Department Management</h1>
          <p className="text-muted-foreground mt-1">Configure support departments and routing rules.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          Add Department
        </button>
      </div>

      {error && <div className="text-red-500 font-medium">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">Loading departments...</div>
        ) : departments.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">No departments configured yet.</div>
        ) : (
          departments.map((dept) => (
            <div key={dept._id} className="bg-card border rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-foreground">{dept.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    {dept.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{dept.description || 'No description provided.'}</p>
                <div className="text-xs bg-muted p-2 rounded border font-mono text-muted-foreground">
                  Alias: {dept.supportEmailAlias || `${dept.name.toLowerCase()}@acme.com`}
                </div>
              </div>
              
              <div className="flex gap-2 justify-end border-t pt-4">
                <button 
                  onClick={() => handleOpenModal(dept)}
                  className="px-3 py-1.5 text-xs font-medium border rounded hover:bg-muted"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(dept._id)}
                  className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-xl max-w-md w-full p-6 space-y-6 shadow-xl">
            <h2 className="text-xl font-bold">{editingDept ? 'Edit Department' : 'Create Department'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Department Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. MIS, LMS, Billing"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea 
                  rows={3}
                  placeholder="Describe the scope of support handled by this team..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Support Email Alias</label>
                <input 
                  type="email"
                  placeholder="e.g. lms-support@acme.com"
                  value={formData.supportEmailAlias}
                  onChange={(e) => setFormData({ ...formData, supportEmailAlias: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-transparent"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
