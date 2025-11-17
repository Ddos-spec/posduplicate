import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import axios from 'axios';
import { X, Plus, Edit, Trash2, Users } from 'lucide-react';
import useConfirmationStore from '../../store/confirmationStore';

interface Table {
  id: number;
  name: string;
  capacity: number;
  status: string;
  outlet?: { name: string };
}

interface TableManagementProps {
  onClose: () => void;
  onSelectTable?: (table: Table) => void;
}

export default function TableManagement({ onClose, onSelectTable }: TableManagementProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [form, setForm] = useState({ name: '', capacity: '4' });
  const [isProcessing, setIsProcessing] = useState(false);
  const { showConfirmation } = useConfirmationStore();

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tables');
      setTables(response.data.data);
    } catch (error: unknown) {
      console.error('Error loading tables:', error);
      let errorMessage = 'Failed to load tables';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (table?: Table) => {
    if (table) {
      setEditingTable(table);
      setForm({ name: table.name, capacity: String(table.capacity) });
    } else {
      setEditingTable(null);
      setForm({ name: '', capacity: '4' });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.capacity) {
      toast.error('Table name and capacity are required');
      return;
    }
    setIsProcessing(true);
    try {
      if (editingTable) {
        await api.put(`/tables/${editingTable.id}`, form);
        toast.success('Table updated successfully');
      } else {
        await api.post('/tables', form);
        toast.success('Table added successfully');
      }
      setShowForm(false);
      loadTables();
    } catch (error: unknown) {
      console.error('Error saving table:', error);
      let errorMessage = 'Failed to save table';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = (tableId: number) => {
    showConfirmation(
      'Delete Table',
      'Are you sure you want to delete this table?',
      async () => {
        try {
          await api.delete(`/tables/${tableId}`);
          toast.success('Table deleted successfully');
          loadTables();
        } catch (error: unknown) {
          console.error('Error deleting table:', error);
          let errorMessage = 'Failed to delete table';
          if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
            errorMessage = error.response.data.error.message;
          }
          toast.error(errorMessage);
        }
      }
    );
  };

  const handleStatusChange = async (tableId: number, newStatus: string) => {
    try {
      await api.put(`/tables/${tableId}/status`, { status: newStatus });
      toast.success('Table status updated');
      loadTables();
    } catch (error: unknown) {
      console.error('Error updating table status:', error);
      let errorMessage = 'Failed to update table status';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'occupied':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'reserved':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[90vw] max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold">Table Management</h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleOpenForm()}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Table
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tables.map((table) => (
                <div
                  key={table.id}
                  className={`border-2 rounded-lg p-4 transition cursor-pointer ${getStatusColor(table.status)}`}
                  onClick={() => onSelectTable && onSelectTable(table)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{table.name}</h3>
                      <p className="text-sm flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {table.capacity} seats
                      </p>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenForm(table)}
                        className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(table.id)}
                        className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="text-xs font-semibold uppercase">{table.status}</span>
                  </div>

                  {/* Status Change Buttons */}
                  <div className="mt-3 space-y-1" onClick={(e) => e.stopPropagation()}>
                    {table.status !== 'available' && (
                      <button
                        onClick={() => handleStatusChange(table.id, 'available')}
                        className="w-full text-xs py-1 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Set Available
                      </button>
                    )}
                    {table.status !== 'occupied' && (
                      <button
                        onClick={() => handleStatusChange(table.id, 'occupied')}
                        className="w-full text-xs py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Set Occupied
                      </button>
                    )}
                    {table.status !== 'reserved' && (
                      <button
                        onClick={() => handleStatusChange(table.id, 'reserved')}
                        className="w-full text-xs py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      >
                        Set Reserved
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-600">Total Tables: </span>
              <span className="font-semibold">{tables.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Available: </span>
              <span className="font-semibold text-green-600">
                {tables.filter(t => t.status === 'available').length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Occupied: </span>
              <span className="font-semibold text-red-600">
                {tables.filter(t => t.status === 'occupied').length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Reserved: </span>
              <span className="font-semibold text-yellow-600">
                {tables.filter(t => t.status === 'reserved').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editingTable ? 'Edit Table' : 'Add New Table'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Table Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Table 1, VIP 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Capacity (seats) *</label>
                <input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="4"
                  min="1"
                />
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
                  {isProcessing ? 'Saving...' : editingTable ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
