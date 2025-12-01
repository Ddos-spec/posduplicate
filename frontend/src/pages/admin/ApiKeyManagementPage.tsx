import { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, Copy, Key, Check } from 'lucide-react';
import { apiKeyService } from '../../services/apiKeyService';
import { tenantService } from '../../services/tenantService';
import toast from 'react-hot-toast';

interface ApiKey {
  id: number;
  key_name: string;
  api_key: string;
  last_used: string | null;
  created_at: string;
  tenant?: {
    id: number;
    businessName: string;
  };
}

interface Tenant {
  id: number;
  businessName: string;
  email: string;
}

export default function ApiKeyManagementPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState<number | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [keyName, setKeyName] = useState('Default API Key');
  const [generatedKey, setGeneratedKey] = useState(''); // To show only once

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load Keys
      try {
        const keysRes = await apiKeyService.getAllKeys();
        if (keysRes && keysRes.data) {
          setApiKeys(keysRes.data);
        } else if (Array.isArray(keysRes)) {
          setApiKeys(keysRes);
        }
      } catch (err) {
        console.error('Error loading API keys:', err);
        // Don't block tenants loading
      }

      // Load Tenants
      try {
        const tenantsRes = await tenantService.getAllTenants();
        console.log('Tenants response:', tenantsRes); // Debug log for user/dev
        if (tenantsRes && tenantsRes.data) {
          setTenants(tenantsRes.data);
        } else if (Array.isArray(tenantsRes)) {
          setTenants(tenantsRes);
        }
      } catch (err) {
        console.error('Error loading tenants:', err);
        toast.error('Failed to load tenants list');
      }

    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTenant) {
      toast.error('Please select a tenant');
      return;
    }

    try {
      const response = await apiKeyService.generateKey({
        tenantId: parseInt(selectedTenant),
        name: keyName
      });

      const newKey = response;
      setGeneratedKey(newKey.api_key || ''); // Show full key once
      if (newKey.api_key) {
        toast.success('API Key generated successfully');
      } else {
        toast.error('API Key generated but secret was missing in response');
      }
      // Don't close modal yet, let them copy the key
    } catch (error) {
      console.error('Failed to generate key:', error);
      toast.error('Failed to generate API key');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure? This will immediately block access for this tenant.')) return;
    
    try {
      await apiKeyService.revokeKey(id);
      setApiKeys(apiKeys.filter(k => k.id !== id));
      toast.success('API Key revoked');
    } catch (error) {
      toast.error('Failed to revoke key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const closeAndReset = () => {
    setShowGenerateModal(false);
    setGeneratedKey('');
    setSelectedTenant('');
    setKeyName('Default API Key');
    loadData(); // Refresh to ensure correct list
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">API Key Management</h1>
          <p className="text-gray-600">Generate and manage access keys for Tenant integration.</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Generate New Key
        </button>
      </div>

      {/* Key List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Key</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
            ) : apiKeys.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No API keys active.</td></tr>
            ) : (
              apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {key.tenant?.businessName || `Tenant #${key.tenant?.id}`}
                    </div>
                    <div className="text-xs text-gray-500">{key.key_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-mono text-sm bg-gray-100 px-2 py-1 rounded w-fit">
                      <Key size={14} className="text-gray-400" />
                      {showKey === key.id ? key.api_key : 'mypos_live_••••••••'}
                      <button onClick={() => setShowKey(showKey === key.id ? null : key.id)} className="text-gray-500 hover:text-blue-600">
                        {showKey === key.id ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => copyToClipboard(key.api_key)} className="text-gray-500 hover:text-blue-600">
                        <Copy size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {key.last_used ? new Date(key.last_used).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(key.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(key.id)}
                      className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50"
                      title="Revoke Access"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold mb-4">Generate API Key</h3>
            
            {!generatedKey ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Select Tenant</label>
                  <select
                    value={selectedTenant}
                    onChange={(e) => setSelectedTenant(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">-- Choose Tenant --</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.businessName} ({t.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Key Name (Optional)</label>
                  <input 
                    type="text"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g. Shopify Integration"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={closeAndReset} className="px-4 py-2 border rounded text-gray-600">Cancel</button>
                  <button onClick={handleGenerate} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Generate</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                    <Check className="text-green-600" size={24} />
                  </div>
                  <h4 className="font-bold text-green-800">API Key Generated!</h4>
                  <p className="text-sm text-green-700 mt-1">Please copy this key now. You won't be able to see it fully again.</p>
                </div>
                
                <div className="bg-gray-100 p-3 rounded-lg border flex items-center justify-between group relative">
                  <code className="font-mono text-sm break-all">{generatedKey}</code>
                  <button 
                    onClick={() => copyToClipboard(generatedKey)}
                    className="ml-2 p-2 bg-white rounded border shadow-sm hover:bg-gray-50"
                  >
                    <Copy size={16} />
                  </button>
                </div>

                <div className="mt-6">
                  <button onClick={closeAndReset} className="w-full px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900">
                    Done, I have copied it
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}