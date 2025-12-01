import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, XCircle, ExternalLink, Loader2, ArrowRight, ShoppingBag } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Integration {
  integrationType: 'qris' | 'gofood' | 'grabfood' | 'shopeefood';
  status: 'active' | 'inactive' | 'pending';
  isActive: boolean;
  configuration: any;
  credentials: any;
}

const INTEGRATION_CONFIG = {
  qris: {
    title: 'QRIS Payment',
    description: 'Terima pembayaran dari semua e-wallet (GoPay, OVO, Dana, dll).',
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: <CreditCard className="w-8 h-8 text-red-600" />,
    signupUrl: 'https://midtrans.com/passport/sign-up', // Example: Midtrans
    logo: '/assets/integrations/qris.svg' // Placeholder path
  },
  gofood: {
    title: 'GoFood',
    description: 'Terima pesanan GoFood langsung di POS.',
    color: 'bg-green-50 text-green-700 border-green-200',
    icon: <ShoppingBag className="w-8 h-8 text-green-600" />,
    signupUrl: 'https://gofood.co.id/daftar',
    logo: '/assets/integrations/gofood.png'
  },
  grabfood: {
    title: 'GrabFood',
    description: 'Kelola pesanan GrabFood tanpa device terpisah.',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <ShoppingBag className="w-8 h-8 text-emerald-600" />,
    signupUrl: 'https://www.grab.com/id/merchant/food/',
    logo: '/assets/integrations/grabfood.png'
  },
  shopeefood: {
    title: 'ShopeeFood',
    description: 'Integrasi pesanan ShopeeFood (Beta).',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: <ShoppingBag className="w-8 h-8 text-orange-600" />,
    signupUrl: 'https://shopee.co.id/m/shopeefood-merchants',
    logo: '/assets/integrations/shopeefood.png'
  }
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [connectStep, setConnectStep] = useState<'choice' | 'form'>('choice');
  const [formData, setFormData] = useState({ merchantId: '', storeUrl: '', apiKey: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const { data } = await api.get('/integrations');
      setIntegrations(data.data);
    } catch (error) {
      console.error('Failed to fetch integrations', error);
      toast.error('Gagal memuat data integrasi');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectClick = (type: string) => {
    setSelectedIntegration(type);
    setConnectStep('choice');
    setFormData({ merchantId: '', storeUrl: '', apiKey: '' });
    setIsConnectModalOpen(true);
  };

  const handleDisconnect = async (type: string) => {
    if (!window.confirm('Apakah Anda yakin ingin memutus koneksi ini?')) return;
    
    try {
      await api.put(`/integrations/${type}`, {
        status: 'inactive',
        isActive: false,
        credentials: {}
      });
      toast.success('Integrasi diputus');
      fetchIntegrations();
    } catch (error) {
      toast.error('Gagal memutus integrasi');
    }
  };

  const handleSubmitConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntegration) return;

    setSubmitting(true);
    try {
      // Simulate API connection delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      await api.put(`/integrations/${selectedIntegration}`, {
        status: 'active',
        isActive: true,
        credentials: formData,
        configuration: {
            connectedAt: new Date().toISOString()
        }
      });

      toast.success(`Berhasil menghubungkan ${INTEGRATION_CONFIG[selectedIntegration as keyof typeof INTEGRATION_CONFIG].title}`);
      setIsConnectModalOpen(false);
      fetchIntegrations();
    } catch (error) {
      toast.error('Gagal menghubungkan. Periksa kredensial Anda.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Integrasi Platform</h1>
        <p className="text-gray-600 mt-1">Hubungkan POS Anda dengan platform food delivery dan pembayaran digital.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => {
          const config = INTEGRATION_CONFIG[integration.integrationType];
          const isConnected = integration.status === 'active';

          return (
            <div 
              key={integration.integrationType} 
              className={`bg-white rounded-xl border transition-all duration-200 hover:shadow-lg ${isConnected ? 'border-green-200 ring-1 ring-green-100' : 'border-gray-200'}`}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-lg ${config.color} bg-opacity-10`}>
                   {/* Using Config Icon or Fallback */}
                   {config.icon}
                  </div>
                  {isConnected ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3" />
                      Terhubung
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Belum Terhubung
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1">{config.title}</h3>
                <p className="text-sm text-gray-600 mb-6 min-h-[40px]">{config.description}</p>

                {isConnected ? (
                  <div className="flex gap-2">
                    <button 
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                      onClick={() => handleConnectClick(integration.integrationType)} // Re-configure
                    >
                      Pengaturan
                    </button>
                    <button 
                      className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
                      onClick={() => handleDisconnect(integration.integrationType)}
                    >
                      Putus
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnectClick(integration.integrationType)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    Hubungkan
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connection Modal */}
      {isConnectModalOpen && selectedIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-xl">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">
                  Hubungkan {INTEGRATION_CONFIG[selectedIntegration as keyof typeof INTEGRATION_CONFIG].title}
                </h3>
                <button onClick={() => setIsConnectModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {connectStep === 'choice' ? (
                <div className="space-y-4">
                  <p className="text-gray-600 mb-4">Apakah Anda sudah memiliki akun merchant di {INTEGRATION_CONFIG[selectedIntegration as keyof typeof INTEGRATION_CONFIG].title}?</p>
                  
                  <button
                    onClick={() => setConnectStep('form')}
                    className="w-full p-4 border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-left group"
                  >
                    <div className="font-semibold text-blue-900 group-hover:text-blue-700">Saya sudah punya akun</div>
                    <div className="text-sm text-gray-500">Hubungkan akun yang sudah ada dengan POS ini.</div>
                  </button>

                  <a
                    href={INTEGRATION_CONFIG[selectedIntegration as keyof typeof INTEGRATION_CONFIG].signupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full p-4 border-2 border-gray-100 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition text-left block group"
                  >
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="font-semibold text-gray-900">Saya belum punya akun</div>
                            <div className="text-sm text-gray-500">Daftar baru di situs resmi platform.</div>
                        </div>
                        <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                    </div>
                  </a>
                </div>
              ) : (
                <form onSubmit={handleSubmitConnection} className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-4">
                    Masukkan data toko Anda. Data ini akan digunakan untuk sinkronisasi laporan (Simulasi).
                  </div>

                  {selectedIntegration === 'qris' ? (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Midtrans Server Key (Opsional)</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="SB-Mid-server-xxxx"
                                value={formData.apiKey}
                                onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                            />
                            <p className="text-xs text-gray-500 mt-1">Biarkan kosong jika hanya menggunakan QRIS Statis (Upload Gambar).</p>
                        </div>
                    </>
                  ) : (
                    <>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Merchant ID / Store ID</label>
                            <input
                                type="text"
                                required
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Contoh: 123456"
                                value={formData.merchantId}
                                onChange={(e) => setFormData({...formData, merchantId: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">URL Toko (Opsional)</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="https://gofood.co.id/..."
                                value={formData.storeUrl}
                                onChange={(e) => setFormData({...formData, storeUrl: e.target.value})}
                            />
                        </div>
                    </>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setConnectStep('choice')}
                      className="flex-1 px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                    >
                      Kembali
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Koneksi'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
