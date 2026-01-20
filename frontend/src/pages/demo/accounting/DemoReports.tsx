import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import DemoLayout from '../DemoLayout';

export default function DemoReports() {
  const [activeTab, setActiveTab] = useState<'pl' | 'bs'>('pl');

  const PL_DATA = {
    revenue: 1250000000,
    cogs: 450000000,
    gross: 800000000,
    expense: 250000000,
    net: 550000000
  };

  const BS_DATA = {
    assets: 2500000000,
    liabilities: 500000000,
    equity: 2000000000
  };

  return (
    <DemoLayout variant="accounting" title="Laporan Keuangan (Demo)">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Laporan Keuangan</h1>
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('pl')}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'pl' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
                >
                    Laba Rugi
                </button>
                <button 
                    onClick={() => setActiveTab('bs')}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'bs' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
                >
                    Neraca
                </button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-8 text-center border-b bg-gray-50">
                <h2 className="text-xl font-bold mb-1">{activeTab === 'pl' ? 'LAPORAN LABA RUGI' : 'LAPORAN POSISI KEUANGAN'}</h2>
                <p className="text-gray-500 text-sm">Periode: Desember 2025</p>
            </div>

            <div className="p-8">
                {activeTab === 'pl' ? (
                    <div className="space-y-6">
                        {/* Revenue */}
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-emerald-600 font-bold">
                                <TrendingUp className="w-5 h-5" /> PENDAPATAN
                            </div>
                            <div className="flex justify-between py-2 border-b">
                                <span>Penjualan Bersih</span>
                                <span>Rp {PL_DATA.revenue.toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        {/* COGS */}
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-orange-600 font-bold">
                                <TrendingDown className="w-5 h-5" /> HARGA POKOK PENJUALAN
                            </div>
                            <div className="flex justify-between py-2 border-b">
                                <span>HPP</span>
                                <span className="text-red-500">(Rp {PL_DATA.cogs.toLocaleString('id-ID')})</span>
                            </div>
                        </div>

                        <div className="flex justify-between py-4 bg-gray-50 px-4 rounded font-bold">
                            <span>LABA KOTOR</span>
                            <span>Rp {PL_DATA.gross.toLocaleString('id-ID')}</span>
                        </div>

                        {/* Expense */}
                        <div>
                            <div className="flex justify-between py-2 border-b">
                                <span>Total Beban Operasional</span>
                                <span className="text-red-500">(Rp {PL_DATA.expense.toLocaleString('id-ID')})</span>
                            </div>
                        </div>

                        <div className="flex justify-between py-6 border-t-2 border-black font-bold text-xl text-emerald-600">
                            <span>LABA BERSIH</span>
                            <span>Rp {PL_DATA.net.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div>
                            <h3 className="font-bold text-blue-600 mb-4 border-b pb-2">ASET</h3>
                            <div className="flex justify-between py-2">
                                <span>Aset Lancar</span>
                                <span>Rp 150.000.000</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span>Aset Tetap</span>
                                <span>Rp 2.350.000.000</span>
                            </div>
                            <div className="flex justify-between py-2 font-bold bg-blue-50 px-2 rounded mt-2">
                                <span>TOTAL ASET</span>
                                <span>Rp {BS_DATA.assets.toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-red-600 mb-4 border-b pb-2">KEWAJIBAN & EKUITAS</h3>
                            <div className="flex justify-between py-2">
                                <span>Total Kewajiban</span>
                                <span>Rp {BS_DATA.liabilities.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span>Modal Pemilik</span>
                                <span>Rp 1.450.000.000</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span>Laba Ditahan</span>
                                <span>Rp 550.000.000</span>
                            </div>
                            <div className="flex justify-between py-2 font-bold bg-red-50 px-2 rounded mt-2">
                                <span>TOTAL KEWAJIBAN & EKUITAS</span>
                                <span>Rp {(BS_DATA.liabilities + BS_DATA.equity).toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </DemoLayout>
  );
}
