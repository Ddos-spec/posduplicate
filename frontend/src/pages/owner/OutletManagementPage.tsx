import { useState } from 'react';
import { Plus, Edit, Settings as SettingsIcon, Store, Users as UsersIcon, Package } from 'lucide-react';
import toast from 'react-hot-toast';

interface Outlet {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive';
  users: number;
  products: number;
}

const mockOutlets: Outlet[] = [
  {
    id: 1,
    name: 'Main Store',
    address: 'Jl. Sudirman No. 123, Jakarta Pusat',
    phone: '021-1234567',
    email: 'main@kebuliutsman.com',
    status: 'Active',
    users: 8,
    products: 156
  },
  {
    id: 2,
    name: 'Branch Kemang',
    address: 'Jl. Kemang Raya 45, Jakarta Selatan',
    phone: '021-7654321',
    email: 'kemang@kebuliutsman.com',
    status: 'Active',
    users: 5,
    products: 142
  },
  {
    id: 3,
    name: 'Branch BSD',
    address: 'BSD City Blok A No. 10, Tangerang',
    phone: '021-9999888',
    email: 'bsd@kebuliutsman.com',
    status: 'Inactive',
    users: 0,
    products: 0
  }
];

export default function OutletManagementPage() {
  const [outlets] = useState<Outlet[]>(mockOutlets);
  const [showModal, setShowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Outlet Management</h1>
          <p className="text-gray-600">Manage your business locations</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
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
                    outlet.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {outlet.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p>{outlet.address}</p>
              <p>📞 {outlet.phone}</p>
              <p>📧 {outlet.email}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-purple-600 mb-1">
                  <UsersIcon className="w-4 h-4" />
                  <span className="font-bold">{outlet.users}</span>
                </div>
                <p className="text-xs text-gray-500">Users</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                  <Package className="w-4 h-4" />
                  <span className="font-bold">{outlet.products}</span>
                </div>
                <p className="text-xs text-gray-500">Products</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setSelectedOutlet(outlet);
                  setShowModal(true);
                }}
                className="px-3 py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2 text-sm"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => {
                  setSelectedOutlet(outlet);
                  setShowSettingsModal(true);
                }}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2 text-sm"
              >
                <SettingsIcon className="w-4 h-4" />
                Settings
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
              <input type="text" placeholder="Outlet Name" defaultValue={selectedOutlet?.name} className="w-full px-3 py-2 border rounded-lg" />
              <textarea placeholder="Address" defaultValue={selectedOutlet?.address} className="w-full px-3 py-2 border rounded-lg" rows={3} />
              <input type="tel" placeholder="Phone" defaultValue={selectedOutlet?.phone} className="w-full px-3 py-2 border rounded-lg" />
              <input type="email" placeholder="Email" defaultValue={selectedOutlet?.email} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setSelectedOutlet(null); }} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={() => { toast.success('Outlet saved!'); setShowModal(false); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Outlet Settings - {selectedOutlet?.name}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tax Rate (%)</label>
                <input type="number" placeholder="10" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Service Charge (%)</label>
                <input type="number" placeholder="5" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Receipt Header</label>
                <textarea placeholder="Thank you for visiting!" className="w-full px-3 py-2 border rounded-lg" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowSettingsModal(false); setSelectedOutlet(null); }} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={() => { toast.success('Settings saved!'); setShowSettingsModal(false); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
