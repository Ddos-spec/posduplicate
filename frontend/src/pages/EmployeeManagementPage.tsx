import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Users, Plus, Edit, Trash2, X, Mail, UserCircle, Shield, LogOut, Activity } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface Employee {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  roles?: { name: string };
  lastLogin?: string;
  createdAt: string;
}

export default function EmployeeManagementPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    roleId: '2' // Default to Cashier role
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setEmployees(data.data);
    } catch (error: any) {
      toast.error('Failed to load employees');
      console.error('Load employees error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setForm({
        name: employee.name,
        email: employee.email,
        password: '',
        roleId: '2'
      });
    } else {
      setEditingEmployee(null);
      setForm({ name: '', email: '', password: '', roleId: '2' });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      toast.error('Name and email are required');
      return;
    }

    if (!editingEmployee && !form.password) {
      toast.error('Password is required for new employee');
      return;
    }

    setIsProcessing(true);
    try {
      const data: any = {
        name: form.name,
        email: form.email,
        roleId: parseInt(form.roleId)
      };

      if (form.password) {
        data.password = form.password;
      }

      if (editingEmployee) {
        await api.put(`/users/${editingEmployee.id}`, data);
        toast.success('Employee updated successfully');
      } else {
        await api.post('/users', data);
        toast.success('Employee created successfully');
      }

      setShowForm(false);
      loadEmployees();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to save employee');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (employeeId: number) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      await api.delete(`/users/${employeeId}`);
      toast.success('Employee deleted successfully');
      loadEmployees();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete employee');
    }
  };

  const handleToggleStatus = async (employeeId: number, currentStatus: boolean) => {
    try {
      await api.put(`/users/${employeeId}`, { isActive: !currentStatus });
      toast.success(`Employee ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadEmployees();
    } catch (error: any) {
      toast.error('Failed to update employee status');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h2 className="text-xl font-bold text-gray-800">MyPOS</h2>
              <nav className="flex gap-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/employees')}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg"
                >
                  Employees
                </button>
              </nav>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-500" />
            Employee Management
          </h1>
          <p className="text-gray-600 mt-1">Manage your team members and their access</p>
        </div>

      {/* Add Employee Button */}
      <div className="mb-6">
        <button
          onClick={() => handleOpenForm()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Employee
        </button>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Users className="w-16 h-16 mx-auto mb-2 opacity-50" />
            <p>No employees yet. Add your first employee!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Last Login</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <UserCircle className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-900">{employee.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        {employee.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium text-purple-700">
                          {employee.roles?.name || 'No Role'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(employee.id, employee.isActive)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          employee.isActive
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {employee.lastLogin
                        ? new Date(employee.lastLogin).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleOpenForm(employee)}
                          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id)}
                          className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-600">Total Employees: </span>
              <span className="font-semibold">{employees.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Active: </span>
              <span className="font-semibold text-green-600">
                {employees.filter(e => e.isActive).length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Inactive: </span>
              <span className="font-semibold text-red-600">
                {employees.filter(e => !e.isActive).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Password {editingEmployee ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={form.roleId}
                  onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">Owner</option>
                  <option value="2">Cashier</option>
                  <option value="3">Admin</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300"
                >
                  {isProcessing ? 'Saving...' : editingEmployee ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
