import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bike,
  CheckCircle,
  XCircle,
  Info,
  Settings,
  BarChart3,
  Users,
  TrendingUp,
  Star
} from 'lucide-react';

export default function GrabFoodDetailPage() {
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/owner/integration')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Integrasi</span>
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-50 p-4 rounded-lg">
              <Bike className="w-10 h-10 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">GrabFood</h1>
              <p className="text-gray-600 mt-1">
                Platform food delivery terpercaya di Asia Tenggara
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isActive ? (
              <span className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg font-semibold">
                <CheckCircle className="w-5 h-5" />
                Aktif
              </span>
            ) : (
              <span className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-semibold">
                <XCircle className="w-5 h-5" />
                Belum Aktif
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* About Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Tentang GrabFood</h2>
            <p className="text-gray-600 mb-4">
              GrabFood adalah layanan pesan-antar makanan dari Grab yang menghubungkan merchant
              dengan jutaan pengguna di Indonesia dan Asia Tenggara. Platform ini menawarkan
              berbagai fitur untuk meningkatkan visibilitas dan penjualan bisnis Anda.
            </p>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 mb-2">Keuntungan Bergabung dengan GrabFood:</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Jangkauan luas dengan jutaan pengguna Grab di seluruh Indonesia
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Sistem order management yang mudah dan efisien
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Marketing tools dan program promosi untuk boost penjualan
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Real-time analytics dan insights untuk optimasi bisnis
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Dedicated merchant support dan training
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    GrabRewards untuk pelanggan loyal
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Integration Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Status Integrasi</h2>

            {!isActive ? (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-yellow-900 mb-1">
                        Integrasi Belum Aktif
                      </h4>
                      <p className="text-yellow-800 text-sm">
                        Anda belum terdaftar sebagai merchant GrabFood. Bergabung sekarang untuk
                        mulai menerima pesanan dari jutaan pengguna Grab.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">Persyaratan Pendaftaran:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2 text-sm">Dokumen Legal</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• NIB/SIUP/TDP</li>
                        <li>• NPWP Badan/Pribadi</li>
                        <li>• Sertifikat Halal (opsional)</li>
                      </ul>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2 text-sm">Data Merchant</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Foto outlet (interior & eksterior)</li>
                        <li>• Menu lengkap & foto produk</li>
                        <li>• Info rekening bank</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">Proses Onboarding:</h3>
                  <ol className="space-y-2">
                    <li className="flex items-start gap-3">
                      <span className="bg-emerald-100 text-emerald-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        1
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Isi form aplikasi merchant GrabFood online
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-emerald-100 text-emerald-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        2
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Submit dokumen dan foto outlet yang diperlukan
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-emerald-100 text-emerald-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        3
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Setup menu katalog dengan foto dan deskripsi
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-emerald-100 text-emerald-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        4
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Merchant training & onboarding session
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-emerald-100 text-emerald-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        5
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Verifikasi dan QA check (3-5 hari kerja)
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-emerald-100 text-emerald-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        6
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Go live! Mulai terima pesanan dari pelanggan
                      </span>
                    </li>
                  </ol>
                </div>

                <button className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition-colors font-semibold mt-4">
                  Daftar Jadi Merchant GrabFood
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-green-900 mb-1">
                        Integrasi Aktif
                      </h4>
                      <p className="text-green-800 text-sm">
                        Outlet Anda sudah terdaftar di GrabFood dan siap menerima pesanan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Merchant ID</p>
                    <p className="font-bold text-gray-800">GRAB123456789</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <p className="font-bold text-green-600">Live</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Rating</p>
                    <p className="font-bold text-gray-800 flex items-center gap-1">
                      4.7 <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Pesanan Bulan Ini</p>
                    <p className="font-bold text-gray-800">856</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Performance Stats (only show when active) */}
          {isActive && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Performa Bulan Ini</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800 mb-1">856</div>
                  <div className="text-sm text-gray-600">Total Pesanan</div>
                  <div className="text-xs text-green-600 mt-1">+12% vs bulan lalu</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600 mb-1">Rp 18.2M</div>
                  <div className="text-sm text-gray-600">Revenue</div>
                  <div className="text-xs text-green-600 mt-1">+8% vs bulan lalu</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800 mb-1">4.7</div>
                  <div className="text-sm text-gray-600">Rating</div>
                  <div className="text-xs text-gray-500 mt-1">256 reviews</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800 mb-1">92%</div>
                  <div className="text-sm text-gray-600">Acceptance Rate</div>
                  <div className="text-xs text-green-600 mt-1">Excellent!</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Quick Actions & Info */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Aksi Cepat</h2>
            <div className="space-y-3">
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Settings className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700 font-medium">Kelola Menu</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700 font-medium">Dashboard Analytics</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <TrendingUp className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700 font-medium">Kampanye Promo</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Star className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700 font-medium">Rating & Review</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Info className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700 font-medium">Merchant Guide</span>
              </button>
            </div>
          </div>

          {/* Commission Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Komisi & Fee</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-gray-800">20-30%</span>
                  <span className="text-gray-600">komisi</span>
                </div>
                <p className="text-sm text-gray-500">
                  Tergantung kategori dan lokasi merchant
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Biaya Registrasi</span>
                    <span className="font-semibold text-gray-800">Gratis</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subscription Fee</span>
                    <span className="font-semibold text-gray-800">Gratis</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Cycle</span>
                    <span className="font-semibold text-gray-800">Weekly</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Min. Transaction</span>
                    <span className="font-semibold text-gray-800">Rp 10.000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Market Reach */}
          <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-6 h-6 text-emerald-600" />
              <h3 className="font-semibold text-emerald-900">
                Market Reach
              </h3>
            </div>
            <p className="text-emerald-800 text-sm mb-3">
              Expand your business dengan jangkauan GrabFood di seluruh Asia Tenggara.
            </p>
            <div className="space-y-2">
              <div className="bg-white rounded-lg p-3">
                <div className="text-2xl font-bold text-emerald-600 mb-1">5 Juta+</div>
                <div className="text-sm text-gray-600">Pengguna Aktif di Indonesia</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-2xl font-bold text-emerald-600 mb-1">8 Negara</div>
                <div className="text-sm text-gray-600">di Asia Tenggara</div>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              Butuh Bantuan?
            </h3>
            <p className="text-blue-800 text-sm mb-4">
              Merchant Success Team kami siap membantu Anda 24/7.
            </p>
            <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
