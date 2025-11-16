import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, User, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { employeeService } from '../../services/employeeService';
import type { Employee as ApiEmployee } from '../../services/employeeService';
import { outletService } from '../../services/outletService';
import type { Outlet } from '../../services/outletService';

export default function EmployeeManagementPage() {
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterPosition, setFilterPosition] = useState<string>('All');
  const [filterOutlet, setFilterOutlet] = useState<string>('All');
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<ApiEmployee | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    user_id: 0,
    employee_code: '',
    pin_code: '',
    position: 'Cashier',
    outlet_id: 0,
    salary: 0,
    hired_at: '',
    is_active: true
  });

  // Fetch employees and outlets
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [employeesRes, outletsRes] = await Promise.all([
        employeeService.getAll(),
        outletService.getAll()
      ]);

      setEmployees(employeesRes.data);
      setOutlets(outletsRes.data);

      // Set default outlet if available
      if (outletsRes.data.length > 0 && formData.outlet_id === 0) {
        setFormData(prev => ({ ...prev, outlet_id: outletsRes.data[0].id }));
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      (emp.users?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.employee_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.users?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || (emp.is_active ? 'Active' : 'Inactive') === filterStatus;
    const matchesPosition = filterPosition === 'All' || emp.position === filterPosition;
    const matchesOutlet = filterOutlet === 'All' || emp.outlet_id === Number(filterOutlet);
    return matchesSearch && matchesStatus && matchesPosition && matchesOutlet;
  });

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setFormData({
      user_id: 0,
      employee_code: '',
      pin_code: '',
      position: 'Cashier',
      outlet_id: outlets.length > 0 ? outlets[0].id : 0,
      salary: 0,
      hired_at: '',
      is_active: true
    });
    setShowModal(true);
  };

  const handleEditEmployee = (employee: ApiEmployee) => {
    setSelectedEmployee(employee);
    setFormData({
      user_id: employee.user_id,
      employee_code: employee.employee_code || '',
      pin_code: employee.pin_code || '',
      position: employee.position || 'Cashier',
      outlet_id: employee.outlet_id,
      salary: employee.salary || 0,
      hired_at: employee.hired_at ? employee.hired_at.split('T')[0] : '',
      is_active: employee.is_active
    });
    setShowModal(true);
  };

  const handleSaveEmployee = async () => {
    try {
      if (selectedEmployee) {
        await employeeService.update(selectedEmployee.id, formData);
        toast.success('Employee updated successfully!');
      } else {
        await employeeService.create(formData);
        toast.success('Employee created successfully!');
      }

      setShowModal(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving employee:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to save employee');
    }
  };

  const handleDeleteEmployee = async (employee: ApiEmployee) => {
    if (confirm(`Delete employee "${employee.users?.name || 'this employee'}"?`)) {
      try {
        await employeeService.delete(employee.id);
        toast.success('Employee deleted successfully!');
        fetchData();
      } catch (error: any) {
        console.error('Error deleting employee:', error);
        toast.error(error.response?.data?.error?.message || 'Failed to delete employee');
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getPositionBadge = (position: string) => {
    const colors: Record<string, string> = {
      Manager: 'bg-purple-100 text-purple-800',
      Cashier: 'bg-blue-100 text-blue-800',
      Kitchen: 'bg-orange-100 text-orange-800',
      Waiter: 'bg-green-100 text-green-800'
    };
    return colors[position] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading employees...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Employee Management</h1>
        <p className="text-gray-600">Manage your employees and staff members</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-800">{employees.length}</p>
            </div>
            <User className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {employees.filter(e => e.isActive).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-red-600">
                {employees.filter(e => !e.isActive).length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Positions</p>
              <p className="text-2xl font-bold text-purple-600">
                {new Set(employees.map(e => e.position)).size}
              </p>
            </div>
            <User className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Positions</option>
            <option value="Manager">Manager</option>
            <option value="Cashier">Cashier</option>
            <option value="Kitchen">Kitchen</option>
            <option value="Waiter">Waiter</option>
          </select>
          <select
            value={filterOutlet}
            onChange={(e) => setFilterOutlet(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Outlets</option>
            {outlets.map(outlet => (
              <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
            ))}
          </select>
          <button
            onClick={handleAddEmployee}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code / PIN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outlet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{emp.users?.name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{emp.users?.email || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div>{emp.employee_code || 'N/A'}</div>
                    <div className="text-xs text-gray-500">PIN: {emp.pin_code || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPositionBadge(emp.position || 'N/A')}`}>
                      {emp.position || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {outlets.find(o => o.id === emp.outlet_id)?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>N/A</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {emp.salary ? formatCurrency(emp.salary) : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      emp.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const msg = `Performance data for ${emp.users?.name || 'employee'} (Mock)`;
                          toast.success(msg);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="View Performance"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditEmployee(emp)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(emp)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
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
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {selectedEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee Code</label>
                  <input
                    type="text"
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PIN (6 digits)</label>
                  <input
                    type="text"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    maxLength={6}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Position *</label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Manager">Manager</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Waiter">Waiter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Outlet *</label>
                  <select
                    value={formData.outletId}
                    onChange={(e) => setFormData({ ...formData, outletId: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {outlets.map(outlet => (
                      <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0812-xxxx-xxxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salary</label>
                  <input
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hire Date</label>
                  <input
                    type="date"
                    value={formData.hiredAt}
                    onChange={(e) => setFormData({ ...formData, hiredAt: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.isActive ? 'Active' : 'Inactive'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'Active' })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEmployee}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
