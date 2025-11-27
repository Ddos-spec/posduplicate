import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  QrCode,
  CheckCircle,
  XCircle,
  Info,
  Settings,
  BarChart3,
  Download
} from 'lucide-react';

export default function QRISDetailPage() {
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
            <div className="bg-blue-50 p-4 rounded-lg">
              <QrCode className="w-10 h-10 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">QRIS</h1>
              <p className="text-gray-600 mt-1">
                Quick Response Code Indonesian Standard
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
            <h2 className="text-xl font-bold text-gray-800 mb-4">Tentang QRIS</h2>
            <p className="text-gray-600 mb-4">
              QRIS (Quick Response Code Indonesian Standard) adalah standar kode QR untuk pembayaran
              yang memungkinkan pelanggan membayar menggunakan berbagai aplikasi e-wallet dan mobile
              banking hanya dengan satu QR code.
            </p>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 mb-2">Keuntungan Menggunakan QRIS:</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Satu QR code untuk semua e-wallet (GoPay, OVO, DANA, ShopeePay, dll)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Transaksi lebih cepat dan contactless
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Laporan transaksi otomatis dan real-time
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Biaya transaksi lebih rendah
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Meningkatkan kepercayaan pelanggan
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
                        Anda belum mengaktifkan integrasi QRIS. Aktifkan sekarang untuk mulai
                        menerima pembayaran digital.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">Langkah-langkah Aktivasi:</h3>
                  <ol className="space-y-2">
                    <li className="flex items-start gap-3">
                      <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        1
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Siapkan dokumen bisnis (NPWP, NIB, atau dokumen legalitas usaha)
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        2
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Lengkapi informasi bisnis dan data rekening bank
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        3
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Tunggu verifikasi dari penyedia layanan QRIS (1-3 hari kerja)
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        4
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Dapatkan QR code QRIS Anda dan mulai terima pembayaran
                      </span>
                    </li>
                  </ol>
                </div>

                <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold mt-4">
                  Mulai Aktivasi QRIS
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
                        QRIS Anda sudah aktif dan siap menerima pembayaran.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Merchant ID</p>
                    <p className="font-bold text-gray-800">ID1234567890</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <p className="font-bold text-green-600">Verified</p>
                  </div>
                </div>

                <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                  <Download className="w-4 h-4 inline mr-2" />
                  Download QR Code
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Quick Actions & Info */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Aksi Cepat</h2>
            <div className="space-y-3">
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Settings className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700 font-medium">Pengaturan</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700 font-medium">Lihat Statistik</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Info className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700 font-medium">Panduan Lengkap</span>
              </button>
            </div>
          </div>

          {/* Pricing Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Biaya Transaksi</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-gray-800">0.7%</span>
                  <span className="text-gray-600">per transaksi</span>
                </div>
                <p className="text-sm text-gray-500">
                  MDR (Merchant Discount Rate)
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Biaya Aktivasi</span>
                    <span className="font-semibold text-gray-800">Gratis</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Biaya Bulanan</span>
                    <span className="font-semibold text-gray-800">Gratis</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Settlement</span>
                    <span className="font-semibold text-gray-800">T+1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              Butuh Bantuan?
            </h3>
            <p className="text-blue-800 text-sm mb-4">
              Tim support kami siap membantu Anda dengan proses integrasi QRIS.
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
