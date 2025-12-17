import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import DemoLayout from '../DemoLayout';

const DUMMY_LEDGER = [
  { id: 1, date: '2025-12-01', journal: 'JU-001', desc: 'Saldo Awal', debit: 50000000, credit: 0, balance: 50000000 },
  { id: 2, date: '2025-12-05', journal: 'JU-005', desc: 'Pembelian Perlengkapan', debit: 0, credit: 2500000, balance: 47500000 },
  { id: 3, date: '2025-12-10', journal: 'JU-012', desc: 'Penerimaan Pendapatan', debit: 15000000, credit: 0, balance: 62500000 },
  { id: 4, date: '2025-12-15', journal: 'JU-018', desc: 'Bayar Listrik', debit: 0, credit: 1200000, balance: 61300000 },
];

export default function DemoLedger() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState('1101');

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
        setEntries(DUMMY_LEDGER);
        setLoading(false);
    }, 600);
  }, [selectedAccount]);

  return (
    <DemoLayout variant="accounting" title="Buku Besar (Demo)">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Buku Besar</h1>

        <div className="bg-white rounded-xl shadow border border-gray-100 mb-6 p-6">
            <div className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Akun</label>
                    <select 
                        className="w-full p-2 border rounded-lg"
                        value={selectedAccount}
                        onChange={e => setSelectedAccount(e.target.value)}
                    >
                        <option value="1101">1101 - Kas Besar</option>
                        <option value="1102">1102 - Bank BCA</option>
                        <option value="4101">4101 - Pendapatan Jasa</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Periode</label>
                    <input type="month" className="w-full p-2 border rounded-lg" defaultValue="2025-12" />
                </div>
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 h-10">Tampilkan</button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                    <tr>
                        <th className="px-6 py-3 text-left">Tanggal</th>
                        <th className="px-6 py-3 text-left">No. Jurnal</th>
                        <th className="px-6 py-3 text-left">Keterangan</th>
                        <th className="px-6 py-3 text-right">Debit</th>
                        <th className="px-6 py-3 text-right">Kredit</th>
                        <th className="px-6 py-3 text-right">Saldo</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {loading ? (
                        <tr><td colSpan={6} className="py-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></td></tr>
                    ) : (
                        entries.map(entry => (
                            <tr key={entry.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3">{entry.date}</td>
                                <td className="px-6 py-3 font-medium text-blue-600">{entry.journal}</td>
                                <td className="px-6 py-3">{entry.desc}</td>
                                <td className="px-6 py-3 text-right">{entry.debit > 0 ? entry.debit.toLocaleString('id-ID') : '-'}</td>
                                <td className="px-6 py-3 text-right">{entry.credit > 0 ? entry.credit.toLocaleString('id-ID') : '-'}</td>
                                <td className="px-6 py-3 text-right font-bold">Rp {entry.balance.toLocaleString('id-ID')}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </DemoLayout>
  );
}
