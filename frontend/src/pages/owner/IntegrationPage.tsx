import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check
} from 'lucide-react';

interface IntegrationCard {
  id: string;
  name: string;
  logo: string;
  description: string;
  color: string;
  bgColor: string;
  isActive?: boolean;
  path: string;
}

export default function IntegrationPage() {
  const navigate = useNavigate();

  const integrations: IntegrationCard[] = [
    {
      id: 'qris',
      name: 'QRIS',
      logo: '/assets/integrations/qris.svg',
      description: 'Terima pembayaran digital melalui QRIS dari berbagai e-wallet dan bank',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      isActive: false,
      path: '/owner/integration/qris'
    },
    {
      id: 'gofood',
      name: 'GoFood',
      logo: '/assets/integrations/gofood.png',
      description: 'Integrasikan bisnis Anda dengan platform GoFood untuk jangkauan lebih luas',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      isActive: false,
      path: '/owner/integration/gofood'
    },
    {
      id: 'grabfood',
      name: 'GrabFood',
      logo: '/assets/integrations/grabfood.png',
      description: 'Hubungkan toko Anda dengan GrabFood dan tingkatkan penjualan online',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      isActive: false,
      path: '/owner/integration/grabfood'
    },
    {
      id: 'shopeefood',
      name: 'ShopeeFood',
      logo: '/assets/integrations/shopeefood.png',
      description: 'Bergabung dengan ShopeeFood untuk menjangkau lebih banyak pelanggan',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      isActive: false,
      path: '/owner/integration/shopeefood'
    }
  ];

  const handleCardClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Integrasi</h1>
        <p className="text-gray-600">
          Kelola integrasi bisnis Anda dengan berbagai platform pembayaran dan delivery
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Integrasi</p>
              <p className="text-2xl font-bold text-gray-800">4</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="w-8 h-8 flex items-center justify-center">
                <span className="text-2xl">🔗</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Aktif</p>
              <p className="text-2xl font-bold text-green-600">0</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <Check className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tersedia</p>
              <p className="text-2xl font-bold text-gray-800">4</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="w-8 h-8 flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {integrations.map((integration) => {
          return (
            <div
              key={integration.id}
              onClick={() => handleCardClick(integration.path)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`${integration.bgColor} p-4 rounded-lg flex items-center justify-center`}>
                    <img
                      src={integration.logo}
                      alt={`${integration.name} logo`}
                      className="w-12 h-12 object-contain"
                    />
                  </div>
                  {integration.isActive && (
                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                      Aktif
                    </span>
                  )}
                  {!integration.isActive && (
                    <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">
                      Belum Aktif
                    </span>
                  )}
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {integration.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {integration.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <button
                    className={`flex items-center gap-2 ${integration.color} font-semibold text-sm group-hover:gap-3 transition-all`}
                  >
                    <span>Lihat Detail</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="bg-blue-100 p-2 rounded-lg">
            <span className="text-2xl">💡</span>
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">
              Tingkatkan Bisnis Anda dengan Integrasi
            </h4>
            <p className="text-blue-800 text-sm">
              Integrasikan bisnis Anda dengan berbagai platform pembayaran dan delivery untuk
              meningkatkan penjualan dan mempermudah transaksi. Klik pada salah satu card di atas
              untuk memulai proses integrasi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
