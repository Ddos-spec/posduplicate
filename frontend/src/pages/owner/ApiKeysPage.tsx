import { useState, useEffect } from 'react';
import { Key, CheckCircle, XCircle, Clock, Calendar, Activity } from 'lucide-react';
import { apiKeyService, ApiKey } from '../../services/apiKeyService';
import toast from 'react-hot-toast';

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const keys = await apiKeyService.getMyApiKeys();
      setApiKeys(keys);
    } catch (error) {
      console.error('Error loading API keys:', error);
      toast.error('Gagal memuat API keys');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Belum pernah';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hari ini';
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari yang lalu`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu yang lalu`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  const activeKeys = apiKeys.filter(k => k.is_active);
  const inactiveKeys = apiKeys.filter(k => !k.is_active);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">API Keys</h1>
          <p className="text-gray-600">
            Akses programmatic ke data bisnis Anda
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total API Keys</p>
                <p className="text-3xl font-bold text-gray-800">{apiKeys.length}</p>
              </div>
              <Key className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Aktif</p>
                <p className="text-3xl font-bold text-gray-800">{activeKeys.length}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Nonaktif</p>
                <p className="text-3xl font-bold text-gray-800">{inactiveKeys.length}</p>
              </div>
              <XCircle className="w-12 h-12 text-red-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* API Keys List */}
        {apiKeys.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Key className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Belum Ada API Key
            </h3>
            <p className="text-gray-500">
              API key akan muncul di sini setelah dibuat oleh administrator
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className={`bg-white rounded-lg shadow-sm overflow-hidden border-l-4 ${
                  key.is_active ? 'border-green-500' : 'border-gray-300'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-800">{key.key_name}</h3>
                        {key.is_active ? (
                          <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Aktif
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                            <XCircle className="w-4 h-4" />
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">Key ID: #{key.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 mb-1">Dibuat</p>
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {formatDate(key.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <Activity className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 mb-1">Terakhir Digunakan</p>
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {getTimeAgo(key.last_used)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <Clock className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 mb-1">Kadaluarsa</p>
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {key.expires_at ? formatDate(key.expires_at) : 'Tidak pernah'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {!key.is_active && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        ⚠️ API key ini sedang nonaktif dan tidak dapat digunakan
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
