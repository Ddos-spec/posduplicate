import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Store, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { outletService } from '../../services/outletService';
import type { Outlet } from '../../services/outletService';
import useConfirmationStore from '../../store/confirmationStore';

export default function OutletManagementPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const { showConfirmation } = useConfirmationStore();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    isActive: true
  });

  const fetchOutlets = useCallback(async () => {
    try {
      setLoading(true);
      const result = await outletService.getAll();
      setOutlets(result.data);
    } catch (error: unknown) {
      console.error('Error fetching outlets:', error);
      let errorMessage = 'Failed to load outlets';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch outlets
  useEffect(() => {
    fetchOutlets();
  }, [fetchOutlets]);

  const handleAddOutlet = () => {
    setSelectedOutlet(null);
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      isActive: true
    });
    setShowModal(true);
  };

  const handleEditOutlet = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    setFormData({
      name: outlet.name,
      address: outlet.address || '',
      phone: outlet.phone || '',
      email: outlet.email || '',
      isActive: outlet.isActive
    });
    setShowModal(true);
  };

  const handleSaveOutlet = async () => {
    try {
      if (selectedOutlet) {
        await outletService.update(selectedOutlet.id, formData);
        toast.success('Outlet updated successfully!');
      } else {
        await outletService.create(formData);
        toast.success('Outlet created successfully!');
      }

      setShowModal(false);
      setSelectedOutlet(null);
      fetchOutlets();
    } catch (error: unknown) {
      console.error('Error saving outlet:', error);
      let errorMessage = 'Failed to save outlet';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    }
  };

  const handleDeleteOutlet = (outlet: Outlet) => {
    showConfirmation(
      'Delete Outlet',
      `Are you sure you want to delete outlet "${outlet.name}"?`,
      async () => {
        try {
          await outletService.delete(outlet.id);
          toast.success('Outlet deleted successfully!');
          fetchOutlets();
        } catch (error: unknown) {
          console.error('Error deleting outlet:', error);
          let errorMessage = 'Failed to delete outlet';
          if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
            errorMessage = error.response.data.error.message;
          }
          toast.error(errorMessage);
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading outlets...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Outlet Management</h1>
          <p className="text-gray-600">Manage your business locations</p>
        </div>
        <button
          onClick={handleAddOutlet}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Outlet
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {outlets.map((outlet) => (
          <div key={outlet.id} className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-blue-500">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Store className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{outlet.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    outlet.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {outlet.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p>{outlet.address || 'No address provided'}</p>
              <p>📞 {outlet.phone || 'No phone'}</p>
              <p>📧 {outlet.email || 'No email'}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleEditOutlet(outlet)}
                className="px-3 py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2 text-sm"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => handleDeleteOutlet(outlet)}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">{selectedOutlet ? 'Edit Outlet' : 'Add Outlet'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Outlet Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Main Store"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Jl. Sudirman No. 123, Jakarta"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="021-1234567"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="outlet@example.com"
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
                onClick={() => {
                  setShowModal(false);
                  setSelectedOutlet(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOutlet}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Outlet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
