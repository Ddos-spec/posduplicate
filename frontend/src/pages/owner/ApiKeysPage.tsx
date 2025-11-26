import { useState, useEffect } from 'react';
import { Key, AlertCircle, CheckCircle, Clock, Calendar } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center gap-4">
            <Key className="w-12 h-12" />
            <div>
              <h1 className="text-3xl font-bold">API Keys</h1>
              <p className="text-blue-100 mt-2">
                Informasi API keys untuk akses programmatic ke data bisnis Anda
              </p>
            </div>
          </div>
        </div>

        {/* Info Alert */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Tentang API Keys</h3>
              <p className="text-blue-800 text-sm mb-2">
                API keys digunakan untuk mengakses data bisnis Anda secara programmatic melalui REST API.
                Dengan API key, Anda dapat mengintegrasikan sistem POS dengan aplikasi lain atau membuat
                dashboard custom untuk monitoring bisnis.
              </p>
              <p className="text-blue-800 text-sm">
                <strong>Catatan:</strong> Pengelolaan API keys (create, delete, activate/deactivate) dilakukan
                oleh administrator sistem. Silakan hubungi admin jika Anda memerlukan API key baru atau perubahan
                pada API key yang ada.
              </p>
            </div>
          </div>
        </div>

        {/* API Keys List */}
        {apiKeys.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Key className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Belum Ada API Key
            </h3>
            <p className="text-gray-500 mb-4">
              Anda belum memiliki API key. Hubungi administrator untuk membuat API key.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="bg-white rounded-lg shadow-md overflow-hidden border-l-4 border-blue-500"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">{key.key_name}</h3>
                        {key.is_active ? (
                          <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Aktif
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                            <AlertCircle className="w-4 h-4" />
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">ID: {key.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Dibuat</p>
                        <p className="text-sm font-medium text-gray-700">
                          {formatDate(key.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Terakhir Digunakan</p>
                        <p className="text-sm font-medium text-gray-700">
                          {formatDate(key.last_used)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Kadaluarsa</p>
                        <p className="text-sm font-medium text-gray-700">
                          {key.expires_at ? formatDate(key.expires_at) : 'Tidak pernah'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>🔐 Keamanan:</strong> Nilai API key yang sebenarnya hanya ditampilkan
                      saat pertama kali dibuat oleh administrator. Jika Anda memerlukan API key,
                      hubungi administrator Anda.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* How to Use Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Cara Menggunakan API</h2>
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-4">
              Untuk menggunakan API, Anda perlu menyertakan API key di header setiap request:
            </p>
            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-x-auto">
              <div>X-API-Key: mypos_live_your_api_key_here</div>
            </div>
            <p className="text-gray-600 mt-4 mb-2">
              Contoh request menggunakan cURL:
            </p>
            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-x-auto">
              <div>curl -X GET "https://your-api.com/api/owner/reports/sales" \</div>
              <div className="ml-4">-H "X-API-Key: mypos_live_your_api_key_here"</div>
            </div>
            <p className="text-gray-600 mt-4">
              <strong>Dokumentasi lengkap:</strong> Hubungi administrator untuk mendapatkan dokumentasi
              API lengkap dengan semua endpoint yang tersedia.
            </p>
          </div>
        </div>

        {/* Contact Admin */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-purple-900 mb-2">Butuh Bantuan?</h3>
          <p className="text-purple-800 text-sm">
            Untuk membuat API key baru, mengaktifkan/menonaktifkan API key, atau mendapatkan
            dokumentasi API lengkap, silakan hubungi administrator sistem Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
