import { useState, useEffect } from 'react';
import { adminAnalyticsService } from '../../services/adminAnalyticsService';
import toast from 'react-hot-toast';
import { Key, Plus, Trash2, Eye, EyeOff } from 'lucide-react';

// Mock data for now
const mockApiKeys = [
  { id: 'key_1', tenant: 'Tenant A (Toko Roti Enak)', key: 'sk_live_xxxxxxxxxxxx1234', createdAt: '2023-10-26T10:00:00Z', lastUsed: '2023-11-20T15:30:00Z' },
  { id: 'key_2', tenant: 'Tenant B (Kopi Kenangan)', key: 'sk_live_xxxxxxxxxxxx5678', createdAt: '2023-09-15T11:00:00Z', lastUsed: null },
  { id: 'key_3', tenant: 'Tenant C (Warung Bu Ida)', key: 'sk_live_xxxxxxxxxxxx9012', createdAt: '2023-11-01T09:00:00Z', lastUsed: '2023-11-25T18:00:00Z' },
];


export default function ApiKeyManagementPage() {
  const [apiKeys, setApiKeys] = useState(mockApiKeys);
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState<string | null>(null);

  const toggleShowKey = (id: string) => {
    setShowKey(showKey === id ? null : id);
  };

  // TODO: Replace with actual API calls
  const generateNewKey = (tenantId: string) => {
    toast.success(`New key generated for tenant ${tenantId}`);
  };

  const deleteKey = (keyId: string) => {
    if (window.confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      setApiKeys(apiKeys.filter(key => key.id !== keyId));
      toast.success(`API Key ${keyId} deleted.`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">API Key Management</h1>
          <p className="text-gray-600">Manage API keys for all tenants.</p>
        </div>
        <button
          onClick={() => generateNewKey('some_tenant_id')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Generate New Key
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-sm">Tenant</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">API Key</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Created At</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Last Used</th>
              <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
            ) : apiKeys.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8">No API keys found.</td></tr>
            ) : (
              apiKeys.map(key => (
                <tr key={key.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{key.tenant}</td>
                  <td className="py-3 px-4 font-mono">
                    <div className="flex items-center gap-2">
                      <span>{showKey === key.id ? key.key : 'sk_live_********************'}</span>
                      <button onClick={() => toggleShowKey(key.id)}>
                        {showKey === key.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4">{new Date(key.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4">{key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => deleteKey(key.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
