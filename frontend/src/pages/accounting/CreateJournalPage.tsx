import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Calendar, FileText, Lock, Plus, Trash2,
  BookOpen, AlertCircle, Star, Check, Loader2, Save
} from 'lucide-react';

interface JournalEntryLine {
  id: number;
  accountId: number | '';
  description: string;
  debit: number;
  credit: number;
}

interface AccountOption {
  id: number;
  account_code: string;
  account_name: string;
}

export default function CreateJournalPage() {
  const { isDark } = useThemeStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  
  const [entries, setEntries] = useState<JournalEntryLine[]>([
    { id: 1, accountId: '', description: '', debit: 0, credit: 0 },
    { id: 2, accountId: '', description: '', debit: 0, credit: 0 },
  ]);
  const [formData, setFormData] = useState({
    journalNo: 'AUTO',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  // Fetch Accounts (CoA)
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const response = await api.get('/accounting/coa');
        if (response.data?.success) {
          // Use the 'flat' array provided by the backend for easy dropdown mapping
          const flatAccounts = response.data.data.flat || [];
          setAccounts(flatAccounts);
        }
      } catch (error) {
        console.error('Failed to load accounts:', error);
        toast.error('Gagal memuat daftar akun');
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const addEntry = () => {
    setEntries([...entries, { id: Date.now(), accountId: '', description: '', debit: 0, credit: 0 }]);
  };

  const removeEntry = (id: number) => {
    if (entries.length > 2) {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const updateEntry = (id: number, field: keyof JournalEntryLine, value: string | number) => {
    setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleSubmit = async (status: 'draft' | 'posted') => {
    if (!formData.date || !formData.description) {
      toast.error('Mohon lengkapi Tanggal dan Deskripsi');
      return;
    }

    if (entries.some(e => !e.accountId)) {
      toast.error('Semua baris harus memiliki Akun yang dipilih');
      return;
    }

    if (status === 'posted' && !isBalanced) {
      toast.error('Jurnal tidak seimbang (Unbalanced). Mohon periksa Debit/Kredit.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        journal_type: 'general',
        transaction_date: formData.date,
        description: formData.description,
        reference_type: formData.reference ? 'manual' : null,
        reference_id: null, // manual string ref not fully supported by backend ID field? Check backend.
        // Actually backend has `reference_id` (Int) and `reference_type` (String). 
        // If we want to store a string reference (like "INV-001"), we might need a different field or 
        // put it in description. The backend schema might limit `reference_id` to Int.
        // Let's append reference to description for now to be safe if backend expects Int ID.
        // Or if backend allows null reference_id.
        status, // 'draft' or 'posted'
        lines: entries.map(e => ({
          account_id: Number(e.accountId),
          description: e.description || formData.description,
          debit_amount: Number(e.debit),
          credit_amount: Number(e.credit)
        }))
      };

      await api.post('/accounting/journals', payload);
      
      toast.success(status === 'posted' ? 'Jurnal berhasil diposting!' : 'Draft berhasil disimpan');
      navigate('/accounting/journal'); // Redirect to journal list
      
    } catch (error: any) {
      console.error('Failed to create journal:', error);
      const msg = error.response?.data?.error?.message || 'Gagal menyimpan jurnal';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
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
                    NO. JURNAL
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
                        value={entry.accountId}
                        onChange={(e) => updateEntry(entry.id, 'accountId', e.target.value)}
                        disabled={loading}
                        className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                          isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                        }`}
                      >
                        <option value="">Pilih akun...</option>
                        {accounts.map(acc => (
                           <option key={acc.id} value={acc.id}>
                             {acc.account_code} - {acc.account_name}
                           </option>
                        ))}
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
                        min="0"
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
                        min="0"
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
                disabled={submitting}
                className={`px-6 py-3 rounded-xl font-medium ${isDark ? 'text-gray-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Batal
              </button>
              <button
                onClick={() => handleSubmit('draft')}
                disabled={submitting}
                className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 border ${
                  isDark ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' : 'border-amber-300 text-amber-600 hover:bg-amber-50'
                } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Simpan Draft
              </button>
              <button
                onClick={() => handleSubmit('posted')}
                disabled={!isBalanced || submitting}
                className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
                  isBalanced
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : isDark ? 'bg-slate-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                } ${submitting ? 'opacity-50' : ''}`}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
