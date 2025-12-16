import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import {
  ArrowLeft, Calendar, FileText, Lock, Plus, Trash2,
  BookOpen, AlertCircle, Star, Check
} from 'lucide-react';

interface JournalEntry {
  id: number;
  account: string;
  description: string;
  debit: number;
  credit: number;
}

export default function CreateJournalPage() {
  const { isDark } = useThemeStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'draft' | 'posted'>('draft');
  const [entries, setEntries] = useState<JournalEntry[]>([
    { id: 1, account: '', description: '', debit: 0, credit: 0 },
    { id: 2, account: '', description: '', debit: 0, credit: 0 },
  ]);
  const [formData, setFormData] = useState({
    journalNo: 'JU-2025-0001',
    reference: '',
    date: '',
    description: ''
  });

  const frequentAccounts = [
    { code: '1101', name: 'Kas Besar' },
    { code: '4101', name: 'Pendapatan Jasa' },
    { code: '2101', name: 'Utang Usaha' },
    { code: '5101', name: 'Beban Gaji' },
  ];

  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const addEntry = () => {
    setEntries([...entries, { id: Date.now(), account: '', description: '', debit: 0, credit: 0 }]);
  };

  const removeEntry = (id: number) => {
    if (entries.length > 2) {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const updateEntry = (id: number, field: keyof JournalEntry, value: string | number) => {
    setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-amber-50/30'}`}>
      {/* Breadcrumb */}
      <div className={`border-b ${isDark ? 'border-slate-700' : 'border-amber-200/50'}`}>
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Akuntansi › Jurnal Umum › <span className={isDark ? 'text-white' : 'text-gray-900'}>Buat Jurnal</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/accounting/journal')}
                  className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-amber-100'}`}
                >
                  <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>
                <div>
                  <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Buat Jurnal Umum</h1>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Catat transaksi keuangan dengan sistem double-entry yang presisi.
                  </p>
                </div>
              </div>
              <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' : 'border-amber-300 text-amber-600 hover:bg-amber-50'}`}>
                <FileText className="w-4 h-4" />
                Gunakan Template
              </button>
            </div>

            {/* Basic Info */}
            <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-6 bg-amber-500 rounded-full" />
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Informasi Dasar</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    NO. JURNAL <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.journalNo}
                      readOnly
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none ${
                        isDark ? 'bg-slate-700 border-slate-600 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500'
                      }`}
                    />
                    <Lock className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Nomor otomatis (terkunci)
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    REFERENSI
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: INV-001, PO-023"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Nomor dokumen pendukung (Opsional)
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    TANGGAL TRANSAKSI <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                        isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                      }`}
                    />
                    <Calendar className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    STATUS
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStatus('draft')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                        status === 'draft'
                          ? isDark ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-amber-500 bg-amber-50 text-amber-600'
                          : isDark ? 'border-slate-600 text-gray-400 hover:border-slate-500' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <div className="text-left">
                        <p className="font-medium">Draft</p>
                        <p className="text-xs opacity-75">Simpan sementara</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setStatus('posted')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                        status === 'posted'
                          ? isDark ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-emerald-500 bg-emerald-50 text-emerald-600'
                          : isDark ? 'border-slate-600 text-gray-400 hover:border-slate-500' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <div className="text-left">
                        <p className="font-medium">Posted</p>
                        <p className="text-xs opacity-75">Langsung posting</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  DESKRIPSI TRANSAKSI <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="Jelaskan detail transaksi ini..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  maxLength={500}
                  className={`w-full px-4 py-3 rounded-xl border resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
                <p className={`text-xs text-right mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {formData.description.length}/500
                </p>
              </div>
            </div>

            {/* Journal Entries */}
            <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-amber-500 rounded-full" />
                  <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Entri Akun (Double-Entry)</h2>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
                  isBalanced
                    ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                    : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
                }`}>
                  {isBalanced ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {isBalanced ? 'Balanced' : 'Not Balanced'}
                </span>
              </div>

              {/* Table Header */}
              <div className={`grid grid-cols-12 gap-3 px-4 py-2 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="col-span-1">NO.</div>
                <div className="col-span-3">AKUN</div>
                <div className="col-span-3">DESKRIPSI (OPSIONAL)</div>
                <div className="col-span-2 text-right">DEBIT (RP)</div>
                <div className="col-span-2 text-right">KREDIT (RP)</div>
                <div className="col-span-1"></div>
              </div>

              {/* Entries */}
              <div className="space-y-2 mt-2">
                {entries.map((entry, idx) => (
                  <div key={entry.id} className={`grid grid-cols-12 gap-3 items-center p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                    <div className={`col-span-1 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{idx + 1}</div>
                    <div className="col-span-3">
                      <select
                        value={entry.account}
                        onChange={(e) => updateEntry(entry.id, 'account', e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                          isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                        }`}
                      >
                        <option value="">Pilih akun...</option>
                        <option value="1101">1101 - Kas Besar</option>
                        <option value="4101">4101 - Pendapatan Jasa</option>
                        <option value="2101">2101 - Utang Usaha</option>
                        <option value="5101">5101 - Beban Gaji</option>
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        placeholder="Detail entri"
                        value={entry.description}
                        onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                          isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                        }`}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="0"
                        value={entry.debit || ''}
                        onChange={(e) => updateEntry(entry.id, 'debit', Number(e.target.value))}
                        className={`w-full px-3 py-2 rounded-lg border text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                          isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                        }`}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="0"
                        value={entry.credit || ''}
                        onChange={(e) => updateEntry(entry.id, 'credit', Number(e.target.value))}
                        className={`w-full px-3 py-2 rounded-lg border text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                          isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                        }`}
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        onClick={() => removeEntry(entry.id)}
                        disabled={entries.length <= 2}
                        className={`p-1 rounded ${entries.length > 2 ? 'text-red-500 hover:bg-red-500/10' : 'text-gray-400 cursor-not-allowed'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addEntry}
                className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed w-full justify-center ${
                  isDark ? 'border-slate-600 text-gray-400 hover:border-amber-500 hover:text-amber-400' : 'border-gray-300 text-gray-500 hover:border-amber-500 hover:text-amber-600'
                }`}
              >
                <Plus className="w-4 h-4" />
                Tambah Baris
              </button>

              {/* Totals */}
              <div className={`mt-6 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="grid grid-cols-12 gap-3 font-semibold">
                  <div className={`col-span-7 text-right ${isDark ? 'text-white' : 'text-gray-900'}`}>TOTAL</div>
                  <div className={`col-span-2 text-right ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Rp {totalDebit.toLocaleString('id-ID')}
                  </div>
                  <div className={`col-span-2 text-right ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Rp {totalCredit.toLocaleString('id-ID')}
                  </div>
                  <div className="col-span-1"></div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => navigate('/accounting/journal')}
                className={`px-6 py-3 rounded-xl font-medium ${isDark ? 'text-gray-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Batal
              </button>
              <button
                className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 border ${
                  isDark ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' : 'border-amber-300 text-amber-600 hover:bg-amber-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                Simpan Draft
              </button>
              <button
                className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 border ${
                  isDark ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' : 'border-amber-300 text-amber-600 hover:bg-amber-50'
                }`}
              >
                <Star className="w-4 h-4" />
                Simpan Template
              </button>
              <button
                disabled={!isBalanced}
                className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
                  isBalanced
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : isDark ? 'bg-slate-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                Post Jurnal
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Guide */}
            <div className={`p-6 rounded-xl ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                  <BookOpen className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                </div>
                <h3 className={`font-semibold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Panduan Double-Entry</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className={`font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Prinsip Debit & Kredit</h4>
                  <p className={`text-sm ${isDark ? 'text-amber-300/80' : 'text-amber-600'}`}>
                    Setiap transaksi harus dicatat minimal di dua akun yang berbeda. Satu di sisi Debit, satu lagi di sisi Kredit.
                  </p>
                </div>

                <div>
                  <h4 className={`font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Harus Balance</h4>
                  <p className={`text-sm ${isDark ? 'text-amber-300/80' : 'text-amber-600'}`}>
                    Jumlah total Debit wajib sama persis dengan total Kredit.
                  </p>
                </div>

                <div className={`p-3 rounded-lg ${isDark ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
                  <p className={`text-sm font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Contoh: Penjualan Tunai</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-amber-300/80' : 'text-amber-600'}>Kas (Debit)</span>
                      <span className={isDark ? 'text-amber-300' : 'text-amber-700'}>Rp 1.000.000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-amber-300/80' : 'text-amber-600'}>Pendapatan (Kredit)</span>
                      <span className={isDark ? 'text-amber-300' : 'text-amber-700'}>Rp 1.000.000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Frequent Accounts */}
            <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
              <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Akun Sering Digunakan</h3>
              <div className="space-y-2">
                {frequentAccounts.map((account) => (
                  <button
                    key={account.code}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      isDark ? 'hover:bg-slate-700 text-gray-300' : 'hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    {account.code} - {account.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
