'use client';
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { UserPlus, Trash2, Shield, AlertCircle, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SubUser {
  id: string;
  email: string;
  full_name: string;
  role: 'accountant' | 'viewer';
  is_active: boolean;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  accountant: 'Accountant',
  viewer: 'Viewer',
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  accountant: ['View all data', 'Create & edit invoices', 'Log & approve expenses', 'Manage vouchers', 'Export backups'],
  viewer: ['View all data', 'Export backups'],
};

export default function UserManagementPage() {
  const { isOwner, user, getEffectiveOwnerId } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'accountant' | 'viewer'>('accountant');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    if (!isOwner()) {
      router.replace('/');
      return;
    }
    fetchSubUsers();
  }, []);

  const fetchSubUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) { toast.error('Failed to load users'); return; }
      setSubUsers(data || []);
    } catch {
      toast.error('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviting(true);
    try {
      // Create the sub-user via Supabase auth signup
      const { data, error } = await supabase.auth.signUp({
        email: inviteEmail,
        password: invitePassword,
        options: {
          data: {
            full_name: inviteName,
            role: inviteRole,
          },
        },
      });
      if (error) { setInviteError(error.message); return; }
      if (data.user) {
        // Link to owner
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ owner_id: user?.id, role: inviteRole })
          .eq('id', data.user.id);
        if (updateError) { setInviteError(updateError.message); return; }
      }
      toast.success(`${inviteName} added as ${ROLE_LABELS[inviteRole]}`);
      setShowInvite(false);
      setInviteEmail('');
      setInviteName('');
      setInvitePassword('');
      setInviteRole('accountant');
      fetchSubUsers();
    } catch (err: any) {
      setInviteError(err?.message || 'Failed to add user');
    } finally {
      setInviting(false);
    }
  };

  const handleDeactivate = async (userId: string, name: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: false })
        .eq('id', userId);
      if (error) { toast.error('Failed to deactivate user'); return; }
      toast.success(`${name} deactivated`);
      fetchSubUsers();
    } catch {
      toast.error('Error deactivating user');
    }
  };

  const handleReactivate = async (userId: string, name: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: true })
        .eq('id', userId);
      if (error) { toast.error('Failed to reactivate user'); return; }
      toast.success(`${name} reactivated`);
      fetchSubUsers();
    } catch {
      toast.error('Error reactivating user');
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'accountant' | 'viewer') => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);
      if (error) { toast.error('Failed to update role'); return; }
      toast.success('Role updated');
      fetchSubUsers();
    } catch {
      toast.error('Error updating role');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Add sub-users and control their access to Odinthor
            </p>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-95 transition-all w-full sm:w-auto justify-center sm:justify-start"
          >
            <UserPlus size={15} />
            Add User
          </button>
        </div>

        {/* Role permissions overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => (
            <div key={role} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={16} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{ROLE_LABELS[role]} Permissions</h3>
              </div>
              <ul className="space-y-1.5">
                {perms.map((perm) => (
                  <li key={perm} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
                    {perm}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Add User Form */}
        {showInvite && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-base font-semibold text-foreground mb-4">Add New Sub-User</h3>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Sarah Chen"
                    required
                    className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="sarah@company.com"
                    required
                    className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Password</label>
                  <input
                    type="password"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                    className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'accountant' | 'viewer')}
                    className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="accountant">Accountant — Can create & edit</option>
                    <option value="viewer">Viewer — Read only</option>
                  </select>
                </div>
              </div>

              {inviteError && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-danger/10 border border-danger/20 rounded-lg">
                  <AlertCircle size={14} className="text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-danger">{inviteError}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all"
                >
                  {inviting ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <UserPlus size={14} />
                  )}
                  Add User
                </button>
                <button
                  type="button"
                  onClick={() => { setShowInvite(false); setInviteError(''); }}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Users size={16} className="text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Sub-Users</h3>
            <span className="ml-auto text-xs text-muted-foreground">{subUsers.length} user{subUsers.length !== 1 ? 's' : ''}</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : subUsers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16">
              <Users size={32} className="text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">No sub-users yet</p>
              <p className="text-xs text-muted-foreground">Add a user to give them access to your Odinthor data</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">User</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Role</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Added</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subUsers.map((u) => (
                    <tr key={u.id} className="border-b border-border hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                            {u.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{u.full_name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u.id, e.target.value as 'accountant' | 'viewer')}
                          className="text-xs px-2 py-1 bg-muted border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="accountant">Accountant</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          u.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                        }`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {u.is_active ? (
                            <button
                              onClick={() => handleDeactivate(u.id, u.full_name)}
                              title="Deactivate user"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-danger border border-danger/30 rounded-lg hover:bg-danger/10 transition-colors"
                            >
                              <Trash2 size={12} />
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(u.id, u.full_name)}
                              title="Reactivate user"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-success border border-success/30 rounded-lg hover:bg-success/10 transition-colors"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
