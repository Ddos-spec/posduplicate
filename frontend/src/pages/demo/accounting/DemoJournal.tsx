import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, Lock, Plus, Trash2, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DemoLayout from '../DemoLayout';

export default function DemoJournal() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  
  const [entries, setEntries] = useState([
    { id: 1, accountId: '1101', description: 'Setoran Modal Awal', debit: 50000000, credit: 0 },
    { id: 2, accountId: '3100', description: 'Setoran Modal Awal', debit: 0, credit: 50000000 },
  ]);

  const [formData, setFormData] = useState({
    journalNo: 'JU-2025-0001',
    date: new Date().toISOString().split('T')[0],
    description: 'Setoran Modal Awal Pemilik',
    reference: 'BUKTI-001'
  });

  const accounts = [
    { code: '1101', name: 'Kas Besar' },
    { code: '1102', name: 'Bank BCA' },
    { code: '2101', name: 'Hutang Usaha' },
    { code: '3100', name: 'Modal Pemilik' },
    { code: '4101', name: 'Pendapatan Jasa' },
    { code: '5101', name: 'Beban Gaji' },
  ];

  const totalDebit = entries.reduce((sum, e) => sum + Number(e.debit), 0);
  const totalCredit = entries.reduce((sum, e) => sum + Number(e.credit), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSubmit = (status: 'draft' | 'posted') => {
    if (!isBalanced && status === 'posted') {
        toast.error('Jurnal tidak balance!');
        return;
    }
    setSubmitting(true);
    setTimeout(() => {
        toast.success(`Simulasi: Jurnal berhasil di-${status}`);
        setSubmitting(false);
        navigate('/demo/accounting/owner/ledger'); // Redirect to ledger demo
    }, 1000);
  };

  const updateEntry = (id: number, field: string, value: any) => {
    setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const addEntry = () => {
    setEntries([...entries, { id: Date.now(), accountId: '', description: '', debit: 0, credit: 0 }]);
  };

  const removeEntry = (id: number) => {
    if (entries.length > 2) setEntries(entries.filter(e => e.id !== id));
  };

  return (
    <DemoLayout variant="accounting" title="Buat Jurnal (Demo)">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Buat Jurnal Umum</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                {/* Header Info */}
                <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                    <h2 className="font-semibold mb-4 border-l-4 border-blue-500 pl-3">Informasi Dasar</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">No. Jurnal</label>
                            <input value={formData.journalNo} readOnly className="w-full p-2 bg-gray-50 border rounded text-gray-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Tanggal</label>
                            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2 border rounded" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Deskripsi</label>
                            <textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2 border rounded" />
                        </div>
                    </div>
                </div>

                {/* Lines */}
                <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-semibold border-l-4 border-blue-500 pl-3">Jurnal Entry</h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${isBalanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {isBalanced ? 'Balanced' : 'Unbalanced'}
                        </span>
                    </div>

                    <div className="space-y-3">
                        {entries.map((entry, idx) => (
                            <div key={entry.id} className="grid grid-cols-12 gap-2 items-center p-3 bg-gray-50 rounded-lg">
                                <div className="col-span-1 text-center text-gray-400 font-bold">{idx + 1}</div>
                                <div className="col-span-4">
                                    <select 
                                        className="w-full p-2 border rounded text-sm"
                                        value={entry.accountId}
                                        onChange={e => updateEntry(entry.id, 'accountId', e.target.value)}
                                    >
                                        <option value="">Pilih Akun</option>
                                        {accounts.map(acc => (
                                            <option key={acc.code} value={acc.code}>{acc.code} - {acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-3">
                                    <input 
                                        type="number" 
                                        placeholder="Debit" 
                                        className="w-full p-2 border rounded text-right text-sm"
                                        value={entry.debit || ''}
                                        onChange={e => updateEntry(entry.id, 'debit', Number(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-3">
                                    <input 
                                        type="number" 
                                        placeholder="Credit" 
                                        className="w-full p-2 border rounded text-right text-sm"
                                        value={entry.credit || ''}
                                        onChange={e => updateEntry(entry.id, 'credit', Number(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-1 text-center">
                                    <button onClick={() => removeEntry(entry.id)} className="text-red-500 hover:bg-red-100 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button onClick={addEntry} className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-blue-500 hover:text-blue-500 flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" /> Tambah Baris
                    </button>

                    <div className="mt-6 flex justify-between items-center text-sm font-bold border-t pt-4">
                        <span>TOTAL</span>
                        <div className="flex gap-12 mr-12">
                            <span className="text-blue-600">Dr {totalDebit.toLocaleString('id-ID')}</span>
                            <span className="text-green-600">Cr {totalCredit.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={() => handleSubmit('draft')} className="px-6 py-3 border rounded-lg hover:bg-gray-50">Simpan Draft</button>
                    <button onClick={() => handleSubmit('posted')} disabled={!isBalanced || submitting} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Post Jurnal
                    </button>
                </div>
            </div>

            {/* Sidebar Guide */}
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 h-fit">
                <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2"><FileText className="w-5 h-5" /> Panduan</h3>
                <ul className="space-y-3 text-sm text-blue-700">
                    <li>• Pastikan Total Debit = Total Kredit.</li>
                    <li>• Gunakan deskripsi yang jelas.</li>
                    <li>• Draft bisa diedit, Posted permanen.</li>
                </ul>
            </div>
        </div>
      </div>
    </DemoLayout>
  );
}
