import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UtensilsCrossed,
  CheckCircle,
  XCircle,
  Info,
  Settings,
  BarChart3,
  Users,
  TrendingUp
} from 'lucide-react';

export default function GoFoodDetailPage() {
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
            <div className="bg-green-50 p-4 rounded-lg">
              <UtensilsCrossed className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">GoFood</h1>
              <p className="text-gray-600 mt-1">
                Platform pesan-antar makanan terbesar di Indonesia
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
            <h2 className="text-xl font-bold text-gray-800 mb-4">Tentang GoFood</h2>
            <p className="text-gray-600 mb-4">
              GoFood adalah layanan pesan-antar makanan dari Gojek yang menghubungkan restoran dan
              pelanggan. Dengan jutaan pengguna aktif, GoFood membantu bisnis F&B Anda menjangkau
              lebih banyak pelanggan.
            </p>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 mb-2">Keuntungan Bergabung dengan GoFood:</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Jangkauan pelanggan lebih luas di seluruh Indonesia
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Sistem pembayaran terintegrasi dan aman
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Dashboard analytics untuk monitor penjualan
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Program promosi dan marketing support
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Armada driver yang sudah terlatih dan terpercaya
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
                        Anda belum terdaftar sebagai merchant GoFood. Daftar sekarang untuk mulai
                        menerima pesanan online.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">Persyaratan Pendaftaran:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2 text-sm">Dokumen Bisnis</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• NIB atau SIUP</li>
                        <li>• NPWP</li>
                        <li>• Izin usaha terkait</li>
                      </ul>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2 text-sm">Data Restoran</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Foto lokasi usaha</li>
                        <li>• Menu & harga</li>
                        <li>• Rekening bank</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">Langkah-langkah Pendaftaran:</h3>
                  <ol className="space-y-2">
                    <li className="flex items-start gap-3">
                      <span className="bg-green-100 text-green-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        1
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Lengkapi form pendaftaran merchant GoFood
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-green-100 text-green-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        2
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Upload dokumen bisnis dan foto restoran
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-green-100 text-green-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        3
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Setup menu dan harga produk Anda
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-green-100 text-green-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        4
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Tunggu verifikasi dari tim GoFood (3-7 hari kerja)
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-green-100 text-green-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        5
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Restoran Anda live dan siap terima pesanan!
                      </span>
                    </li>
                  </ol>
                </div>

                <button className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold mt-4">
                  Mulai Pendaftaran GoFood
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
                        Restoran Anda sudah terdaftar di GoFood dan siap menerima pesanan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Merchant ID</p>
                    <p className="font-bold text-gray-800">GF9876543210</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <p className="font-bold text-green-600">Active</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Rating</p>
                    <p className="font-bold text-gray-800">4.5 ⭐</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Pesanan</p>
                    <p className="font-bold text-gray-800">1,234</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Statistics (only show when active) */}
          {isActive && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Statistik Bulan Ini</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800 mb-1">156</div>
                  <div className="text-sm text-gray-600">Pesanan</div>
                </div>
                <div className="text-center border-x border-gray-200">
                  <div className="text-2xl font-bold text-green-600 mb-1">Rp 12.5M</div>
                  <div className="text-sm text-gray-600">Pendapatan</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800 mb-1">4.5</div>
                  <div className="text-sm text-gray-600">Rating</div>
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
                <span className="text-gray-700 font-medium">Pengaturan Menu</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700 font-medium">Lihat Laporan</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <TrendingUp className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700 font-medium">Promosi Aktif</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Info className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700 font-medium">Panduan Merchant</span>
              </button>
            </div>
          </div>

          {/* Commission Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Komisi & Biaya</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-gray-800">25%</span>
                  <span className="text-gray-600">komisi</span>
                </div>
                <p className="text-sm text-gray-500">
                  Per transaksi dari total pesanan
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Biaya Pendaftaran</span>
                    <span className="font-semibold text-gray-800">Gratis</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Biaya Bulanan</span>
                    <span className="font-semibold text-gray-800">Gratis</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Settlement</span>
                    <span className="font-semibold text-gray-800">Weekly</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Potential Reach */}
          <div className="bg-green-50 rounded-lg border border-green-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-6 h-6 text-green-600" />
              <h3 className="font-semibold text-green-900">
                Jangkauan Potensial
              </h3>
            </div>
            <p className="text-green-800 text-sm mb-3">
              Bergabung dengan GoFood untuk menjangkau jutaan pengguna aktif di Indonesia.
            </p>
            <div className="bg-white rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600 mb-1">190 Juta+</div>
              <div className="text-sm text-gray-600">Pengguna Gojek</div>
            </div>
          </div>

          {/* Support */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              Butuh Bantuan?
            </h3>
            <p className="text-blue-800 text-sm mb-4">
              Hubungi Merchant Support GoFood untuk bantuan pendaftaran dan operasional.
            </p>
            <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold">
              Hubungi Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
