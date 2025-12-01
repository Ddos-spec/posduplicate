import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Info,
  Settings,
  BarChart3,
  Users,
  TrendingUp,
  Star,
  Zap
} from 'lucide-react';

export default function ShopeeFoodDetailPage() {
  const navigate = useNavigate();
  const [isActive, _setIsActive] = useState(false);

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
            <div className="bg-orange-50 p-4 rounded-lg flex items-center justify-center">
              <img
                src="/assets/integrations/shopeefood.png"
                alt="ShopeeFood logo"
                className="w-16 h-16 object-contain"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">ShopeeFood</h1>
              <p className="text-gray-600 mt-1">
                Platform food delivery dari ekosistem Shopee
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
            <h2 className="text-xl font-bold text-gray-800 mb-4">Tentang ShopeeFood</h2>
            <p className="text-gray-600 mb-4">
              ShopeeFood adalah layanan pesan-antar makanan yang terintegrasi dengan ekosistem
              Shopee. Dengan basis pengguna Shopee yang sangat besar, ShopeeFood memberikan
              peluang luar biasa untuk meningkatkan penjualan dan jangkauan bisnis F&B Anda.
            </p>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 mb-2">Keuntungan Bergabung dengan ShopeeFood:</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Akses ke jutaan pengguna Shopee yang sudah terbiasa berbelanja online
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Integrasi dengan ShopeePay untuk kemudahan pembayaran
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Program flash sale dan voucher untuk boost visibilitas
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Live streaming feature untuk promosi produk
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Analytics dashboard untuk tracking performance
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    Cross-selling opportunity dengan Shopee Mall
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
                        Anda belum terdaftar sebagai merchant ShopeeFood. Bergabung sekarang dan
                        manfaatkan ekosistem Shopee untuk meningkatkan penjualan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">Persyaratan Pendaftaran:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2 text-sm">Dokumen Usaha</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• KTP Pemilik Usaha</li>
                        <li>• NPWP (Pribadi/Badan)</li>
                        <li>• NIB/SIUP</li>
                        <li>• Sertifikat Halal (jika ada)</li>
                      </ul>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2 text-sm">Data Toko</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Foto toko/outlet</li>
                        <li>• Daftar menu & harga</li>
                        <li>• Foto produk berkualitas</li>
                        <li>• Nomor rekening bank</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-orange-900 mb-1">
                        Promo Khusus Merchant Baru!
                      </h4>
                      <p className="text-orange-800 text-sm">
                        Dapatkan 0% komisi untuk 30 hari pertama dan gratis featured placement
                        untuk merchant yang bergabung bulan ini!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">Langkah Pendaftaran:</h3>
                  <ol className="space-y-2">
                    <li className="flex items-start gap-3">
                      <span className="bg-orange-100 text-orange-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        1
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Daftar akun Shopee Seller (jika belum punya)
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-orange-100 text-orange-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        2
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Pilih kategori ShopeeFood dan lengkapi profil toko
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-orange-100 text-orange-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        3
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Upload dokumen legal dan verifikasi identitas
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-orange-100 text-orange-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        4
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Setup katalog produk dengan foto dan deskripsi menarik
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-orange-100 text-orange-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        5
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Ikuti training online untuk merchant ShopeeFood
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-orange-100 text-orange-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        6
                      </span>
                      <span className="text-gray-600 pt-0.5">
                        Tunggu approval (2-4 hari kerja) dan mulai berjualan!
                      </span>
                    </li>
                  </ol>
                </div>

                <button className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition-colors font-semibold mt-4">
                  Mulai Daftar ShopeeFood
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
                        Toko Anda sudah live di ShopeeFood dan siap menerima pesanan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Shop ID</p>
                    <p className="font-bold text-gray-800">SPFOOD987654</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <p className="font-bold text-green-600">Active</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Rating</p>
                    <p className="font-bold text-gray-800 flex items-center gap-1">
                      4.8 <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Terjual</p>
                    <p className="font-bold text-gray-800">2.1K</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Performance Stats (only show when active) */}
          {isActive && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Performa 30 Hari Terakhir</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800 mb-1">643</div>
                  <div className="text-sm text-gray-600">Pesanan</div>
                  <div className="text-xs text-green-600 mt-1">+18% vs periode lalu</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 mb-1">Rp 15.8M</div>
                  <div className="text-sm text-gray-600">GMV</div>
                  <div className="text-xs text-green-600 mt-1">+15% vs periode lalu</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800 mb-1">4.8</div>
                  <div className="text-sm text-gray-600">Rating</div>
                  <div className="text-xs text-gray-500 mt-1">412 ulasan</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800 mb-1">89%</div>
                  <div className="text-sm text-gray-600">Chat Response</div>
                  <div className="text-xs text-green-600 mt-1">Good!</div>
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
                <span className="text-gray-700 font-medium">Seller Center</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700 font-medium">Business Insights</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <TrendingUp className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700 font-medium">Marketing Center</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Zap className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700 font-medium">Flash Sale</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Info className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700 font-medium">Seller Education</span>
              </button>
            </div>
          </div>

          {/* Commission Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Komisi & Biaya</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-gray-800">18-22%</span>
                  <span className="text-gray-600">komisi</span>
                </div>
                <p className="text-sm text-gray-500">
                  Bervariasi berdasarkan kategori produk
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Biaya Daftar</span>
                    <span className="font-semibold text-gray-800">Gratis</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Biaya Langganan</span>
                    <span className="font-semibold text-gray-800">Gratis</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Gateway</span>
                    <span className="font-semibold text-gray-800">ShopeePay</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Settlement</span>
                    <span className="font-semibold text-gray-800">Bi-weekly</span>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-3 mt-3">
                <div className="text-sm text-orange-900 font-semibold mb-1">
                  Special Offer! 🎉
                </div>
                <div className="text-xs text-orange-800">
                  0% komisi untuk 30 hari pertama merchant baru
                </div>
              </div>
            </div>
          </div>

          {/* Market Reach */}
          <div className="bg-orange-50 rounded-lg border border-orange-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-6 h-6 text-orange-600" />
              <h3 className="font-semibold text-orange-900">
                Jangkauan Pasar
              </h3>
            </div>
            <p className="text-orange-800 text-sm mb-3">
              Manfaatkan ekosistem Shopee untuk menjangkau lebih banyak pelanggan.
            </p>
            <div className="space-y-2">
              <div className="bg-white rounded-lg p-3">
                <div className="text-2xl font-bold text-orange-600 mb-1">100 Juta+</div>
                <div className="text-sm text-gray-600">Pengguna Shopee Indonesia</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-2xl font-bold text-orange-600 mb-1">Top 3</div>
                <div className="text-sm text-gray-600">E-commerce di Indonesia</div>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              Butuh Bantuan?
            </h3>
            <p className="text-blue-800 text-sm mb-4">
              Shopee University dan Seller Support siap membantu Anda berkembang.
            </p>
            <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold mb-2">
              Chat dengan CS
            </button>
            <button className="w-full bg-white border border-blue-300 text-blue-700 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm font-semibold">
              Shopee University
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
