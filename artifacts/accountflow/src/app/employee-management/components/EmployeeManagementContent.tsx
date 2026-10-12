'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getMonthlyEmployeePay, mapEmployeeRecord, type Employee } from '@/lib/employee-pay';
import EmployeeFormModal from './EmployeeFormModal';

export default function EmployeeManagementContent() {
  const { getEffectiveOwnerId } = useAuth();
  const supabase = createClient();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const ownerId = getEffectiveOwnerId();
      if (!ownerId) return;
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('owner_id', ownerId)
        .order('full_name', { ascending: true });
      if (error) {
        toast.error('Failed to load employees');
        return;
      }
      setEmployees((data || []).map((row) => mapEmployeeRecord(row)));
    } finally {
      setLoading(false);
    }
  }, [getEffectiveOwnerId, supabase]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleAdd = () => {
    setEditingEmployee(null);
    setModalOpen(true);
  };

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setModalOpen(true);
  };

  const handleToggleActive = async (emp: Employee) => {
    const { error } = await supabase
      .from('employees')
      .update({ is_active: !emp.isActive })
      .eq('id', emp.id);
    if (error) {
      toast.error('Failed to update employee status');
      return;
    }
    toast.success(`${emp.fullName} marked as ${!emp.isActive ? 'active' : 'inactive'}`);
    fetchEmployees();
  };

  const handleDelete = async (emp: Employee) => {
    if (!window.confirm(`Delete ${emp.fullName}? This cannot be undone.`)) return;
    setDeletingId(emp.id);
    const { error } = await supabase.from('employees').delete().eq('id', emp.id);
    setDeletingId(null);
    if (error) {
      toast.error('Failed to delete employee');
      return;
    }
    toast.success(`${emp.fullName} removed`);
    fetchEmployees();
  };

  const handleSaved = () => {
    setModalOpen(false);
    fetchEmployees();
  };

  const activeCount = employees.filter((e) => e.isActive).length;
  const totalPayroll = employees
    .filter((e) => e.isActive)
    .reduce((sum, employee) => sum + getMonthlyEmployeePay(employee).gross, 0);

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl px-5 py-4">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Total Employees</p>
          <p className="text-2xl font-bold text-foreground mt-1">{employees.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl px-5 py-4">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Active</p>
          <p className="text-2xl font-bold text-success mt-1">{activeCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl px-5 py-4">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Monthly Payroll</p>
          <p className="text-2xl font-bold text-foreground mt-1">₱{totalPayroll.toLocaleString()}</p>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">Employee Roster</h3>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150 w-full sm:w-auto justify-center sm:justify-start"
          >
            <Plus size={14} />
            Add Employee
          </button>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm" style={{ minWidth: '800px' }}>
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Employee</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Monthly Salary</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">SSS</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pagibig</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">HDMF</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Net (Monthly)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <p className="text-sm text-muted-foreground">Loading employees...</p>
                    </div>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <p className="text-sm text-muted-foreground">No employees registered yet.</p>
                    <button
                      onClick={handleAdd}
                      className="mt-3 text-sm text-primary hover:underline"
                    >
                      Add your first employee
                    </button>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const pay = getMonthlyEmployeePay(emp);
                  return (
                    <tr key={emp.id} className="border-b border-border hover:bg-muted/40 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{emp.fullName}</p>
                        <p className="text-xs text-muted-foreground">{emp.role}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-foreground">
                        ₱{pay.gross.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-danger/80">
                        {pay.sss > 0 ? `(₱${pay.sss.toLocaleString()})` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-danger/80">
                        {pay.pagibig > 0 ? `(₱${pay.pagibig.toLocaleString()})` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-danger/80">
                        {pay.hdmf > 0 ? `(₱${pay.hdmf.toLocaleString()})` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-bold text-success">
                        ₱{pay.net.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            title="Edit employee"
                            onClick={() => handleEdit(emp)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            title={emp.isActive ? 'Deactivate' : 'Activate'}
                            onClick={() => handleToggleActive(emp)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            {emp.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                          </button>
                          <button
                            title="Delete employee"
                            onClick={() => handleDelete(emp)}
                            disabled={deletingId === emp.id}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors disabled:opacity-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EmployeeFormModal
        open={modalOpen}
        employee={editingEmployee}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
