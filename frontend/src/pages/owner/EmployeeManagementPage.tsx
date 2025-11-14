import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Eye, User, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Employee {
  id: number;
  name: string;
  code: string;
  pin: string;
  position: string;
  outlet: string;
  phone: string;
  email: string;
  salary: number;
  hiredAt: string;
  status: 'Active' | 'Inactive';
  photo?: string;
}

const mockEmployees: Employee[] = [
  { id: 1, name: 'Budi Santoso', code: 'EMP001', pin: '123456', position: 'Cashier', outlet: 'Main Store', phone: '0812-1111-1111', email: 'budi@example.com', salary: 4000000, hiredAt: '2024-01-15', status: 'Active' },
  { id: 2, name: 'Siti Rahayu', code: 'EMP002', pin: '234567', position: 'Manager', outlet: 'Main Store', phone: '0812-2222-2222', email: 'siti@example.com', salary: 6000000, hiredAt: '2024-01-10', status: 'Active' },
  { id: 3, name: 'Ahmad Hidayat', code: 'EMP003', pin: '345678', position: 'Cashier', outlet: 'Branch Kemang', phone: '0812-3333-3333', email: 'ahmad@example.com', salary: 4000000, hiredAt: '2024-02-01', status: 'Active' },
  { id: 4, name: 'Dewi Lestari', code: 'EMP004', pin: '456789', position: 'Kitchen', outlet: 'Main Store', phone: '0812-4444-4444', email: 'dewi@example.com', salary: 4500000, hiredAt: '2024-02-15', status: 'Active' },
  { id: 5, name: 'Rizki Pratama', code: 'EMP005', pin: '567890', position: 'Waiter', outlet: 'Main Store', phone: '0812-5555-5555', email: 'rizki@example.com', salary: 3500000, hiredAt: '2024-03-01', status: 'Active' },
  { id: 6, name: 'Ani Kusuma', code: 'EMP006', pin: '678901', position: 'Cashier', outlet: 'Branch Kemang', phone: '0812-6666-6666', email: 'ani@example.com', salary: 4000000, hiredAt: '2024-03-10', status: 'Active' },
  { id: 7, name: 'Hendra Wijaya', code: 'EMP007', pin: '789012', position: 'Manager', outlet: 'Branch Kemang', phone: '0812-7777-7777', email: 'hendra@example.com', salary: 6000000, hiredAt: '2024-03-15', status: 'Active' },
  { id: 8, name: 'Maya Sari', code: 'EMP008', pin: '890123', position: 'Kitchen', outlet: 'Branch Kemang', phone: '0812-8888-8888', email: 'maya@example.com', salary: 4500000, hiredAt: '2024-04-01', status: 'Active' },
  { id: 9, name: 'Eko Prasetyo', code: 'EMP009', pin: '901234', position: 'Waiter', outlet: 'Main Store', phone: '0812-9999-9999', email: 'eko@example.com', salary: 3500000, hiredAt: '2024-04-10', status: 'Active' },
  { id: 10, name: 'Rina Handayani', code: 'EMP010', pin: '012345', position: 'Cashier', outlet: 'Main Store', phone: '0813-1111-1111', email: 'rina@example.com', salary: 4000000, hiredAt: '2024-05-01', status: 'Active' },
  { id: 11, name: 'Faisal Rahman', code: 'EMP011', pin: '112233', position: 'Kitchen', outlet: 'Main Store', phone: '0813-2222-2222', email: 'faisal@example.com', salary: 4500000, hiredAt: '2024-05-15', status: 'Inactive' },
  { id: 12, name: 'Linda Marlina', code: 'EMP012', pin: '223344', position: 'Waiter', outlet: 'Branch Kemang', phone: '0813-3333-3333', email: 'linda@example.com', salary: 3500000, hiredAt: '2024-06-01', status: 'Active' },
  { id: 13, name: 'Tono Susanto', code: 'EMP013', pin: '334455', position: 'Cashier', outlet: 'Main Store', phone: '0813-4444-4444', email: 'tono@example.com', salary: 4000000, hiredAt: '2024-06-10', status: 'Active' },
  { id: 14, name: 'Wati Utami', code: 'EMP014', pin: '445566', position: 'Kitchen', outlet: 'Branch Kemang', phone: '0813-5555-5555', email: 'wati@example.com', salary: 4500000, hiredAt: '2024-07-01', status: 'Active' },
  { id: 15, name: 'Joko Widodo', code: 'EMP015', pin: '556677', position: 'Waiter', outlet: 'Main Store', phone: '0813-6666-6666', email: 'joko@example.com', salary: 3500000, hiredAt: '2024-07-15', status: 'Active' },
  { id: 16, name: 'Sri Mulyani', code: 'EMP016', pin: '667788', position: 'Cashier', outlet: 'Branch Kemang', phone: '0813-7777-7777', email: 'sri@example.com', salary: 4000000, hiredAt: '2024-08-01', status: 'Active' },
  { id: 17, name: 'Bayu Setiawan', code: 'EMP017', pin: '778899', position: 'Kitchen', outlet: 'Main Store', phone: '0813-8888-8888', email: 'bayu@example.com', salary: 4500000, hiredAt: '2024-08-15', status: 'Active' },
  { id: 18, name: 'Diah Permata', code: 'EMP018', pin: '889900', position: 'Manager', outlet: 'Main Store', phone: '0813-9999-9999', email: 'diah@example.com', salary: 6000000, hiredAt: '2024-09-01', status: 'Active' },
  { id: 19, name: 'Yudi Hartono', code: 'EMP019', pin: '990011', position: 'Waiter', outlet: 'Branch Kemang', phone: '0814-1111-1111', email: 'yudi@example.com', salary: 3500000, hiredAt: '2024-09-15', status: 'Inactive' },
  { id: 20, name: 'Nina Agustina', code: 'EMP020', pin: '001122', position: 'Cashier', outlet: 'Main Store', phone: '0814-2222-2222', email: 'nina@example.com', salary: 4000000, hiredAt: '2024-10-01', status: 'Active' }
];

export default function EmployeeManagementPage() {
  const [employees] = useState<Employee[]>(mockEmployees);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterPosition, setFilterPosition] = useState<string>('All');
  const [filterOutlet, setFilterOutlet] = useState<string>('All');
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || emp.status === filterStatus;
    const matchesPosition = filterPosition === 'All' || emp.position === filterPosition;
    const matchesOutlet = filterOutlet === 'All' || emp.outlet === filterOutlet;
    return matchesSearch && matchesStatus && matchesPosition && matchesOutlet;
  });

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setShowModal(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowModal(true);
  };

  const handleSaveEmployee = () => {
    toast.success('Employee saved successfully! (Mock)');
    setShowModal(false);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    if (confirm(`Delete employee "${employee.name}"?`)) {
      toast.success('Employee deleted! (Mock)');
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
                {employees.filter(e => e.status === 'Active').length}
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
                {employees.filter(e => e.status === 'Inactive').length}
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
                        <div className="font-medium text-gray-900">{emp.name}</div>
                        <div className="text-xs text-gray-500">{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div>{emp.code}</div>
                    <div className="text-xs text-gray-500">PIN: {emp.pin}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPositionBadge(emp.position)}`}>
                      {emp.position}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{emp.outlet}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>{emp.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrency(emp.salary)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      emp.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toast.info('View performance (Mock)')}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    defaultValue={selectedEmployee?.name}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee Code</label>
                  <input
                    type="text"
                    defaultValue={selectedEmployee?.code}
                    placeholder="Auto-generated"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PIN (6 digits)</label>
                  <input
                    type="text"
                    defaultValue={selectedEmployee?.pin}
                    maxLength={6}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                  <select
                    defaultValue={selectedEmployee?.position}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Manager">Manager</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Waiter">Waiter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Outlet</label>
                  <select
                    defaultValue={selectedEmployee?.outlet}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Main Store">Main Store</option>
                    <option value="Branch Kemang">Branch Kemang</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    defaultValue={selectedEmployee?.phone}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0812-xxxx-xxxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    defaultValue={selectedEmployee?.email}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salary</label>
                  <input
                    type="number"
                    defaultValue={selectedEmployee?.salary}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hire Date</label>
                  <input
                    type="date"
                    defaultValue={selectedEmployee?.hiredAt}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    defaultValue={selectedEmployee?.status}
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
