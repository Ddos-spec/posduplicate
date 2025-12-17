import { useState, useEffect } from 'react';
import {
  ChevronDown, ChevronRight, Search, Download, RefreshCw, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import DemoLayout from '../DemoLayout';

// --- DUMMY DATA ---
const DUMMY_ACCOUNTS = [
  {
    id: 1,
    code: '1000',
    name: 'ASET',
    type: 'ASSET',
    category: 'CATEGORY',
    balance: 2500000000,
    children: [
      {
        id: 2,
        code: '1100',
        name: 'Aset Lancar',
        type: 'ASSET',
        category: 'SUB_CATEGORY',
        balance: 150000000,
        children: [
          { id: 3, code: '1101', name: 'Kas Besar', type: 'CASH_BANK', category: 'ACCOUNT', balance: 50000000, debit: true },
          { id: 4, code: '1102', name: 'Bank BCA', type: 'CASH_BANK', category: 'ACCOUNT', balance: 100000000, debit: true },
        ]
      },
      {
        id: 5,
        code: '1200',
        name: 'Aset Tetap',
        type: 'ASSET',
        category: 'SUB_CATEGORY',
        balance: 2350000000,
        children: [
          { id: 6, code: '1201', name: 'Gedung', type: 'FIXED_ASSET', category: 'ACCOUNT', balance: 2000000000, debit: true },
          { id: 7, code: '1202', name: 'Kendaraan', type: 'FIXED_ASSET', category: 'ACCOUNT', balance: 350000000, debit: true },
        ]
      }
    ]
  },
  {
    id: 10,
    code: '2000',
    name: 'KEWAJIBAN',
    type: 'LIABILITY',
    category: 'CATEGORY',
    balance: 500000000,
    children: [
        { id: 11, code: '2100', name: 'Hutang Lancar', type: 'LIABILITY', category: 'SUB_CATEGORY', balance: 50000000, children: [
            { id: 12, code: '2101', name: 'Hutang Usaha', type: 'ACCOUNT_PAYABLE', category: 'ACCOUNT', balance: 50000000, debit: false }
        ]}
    ]
  },
  {
    id: 20,
    code: '4000',
    name: 'PENDAPATAN',
    type: 'REVENUE',
    category: 'CATEGORY',
    balance: 1250000000,
    children: [
        { id: 21, code: '4100', name: 'Pendapatan Usaha', type: 'REVENUE', category: 'SUB_CATEGORY', balance: 1250000000, children: [
            { id: 22, code: '4101', name: 'Penjualan Makanan', type: 'REVENUE', category: 'ACCOUNT', balance: 850000000, debit: false },
            { id: 23, code: '4102', name: 'Penjualan Minuman', type: 'REVENUE', category: 'ACCOUNT', balance: 400000000, debit: false }
        ]}
    ]
  }
];

export default function DemoCoA() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>(['1000', '1100', '2000']);
  const [searchTerm, setSearchTerm] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API Load
    setTimeout(() => {
        setAccounts(DUMMY_ACCOUNTS);
        setLoading(false);
    }, 800);
  }, []);

  const toggleExpand = (code: string) => {
    setExpandedAccounts(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const renderAccount = (account: any, level: number = 0) => {
    // Simple Search Filter
    if (searchTerm && !account.name.toLowerCase().includes(searchTerm.toLowerCase()) && !account.code.includes(searchTerm)) {
        // If has children matching, show. If not, hide. (Simplified logic for demo)
        const hasMatch = JSON.stringify(account.children).toLowerCase().includes(searchTerm.toLowerCase());
        if (!hasMatch) return null;
    }

    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedAccounts.includes(account.code);

    return (
      <div key={account.code}>
        <div
          className="flex items-center justify-between py-3 px-4 cursor-pointer hover:bg-gray-50 border-b border-gray-50"
          style={{ paddingLeft: `${level * 24 + 16}px` }}
          onClick={() => hasChildren && toggleExpand(account.code)}
        >
          <div className="flex items-center gap-3">
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{account.name}</span>
                {account.debit !== undefined && (
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                    {account.debit ? 'Dr' : 'Cr'}
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-500">{account.code}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              account.category === 'CATEGORY' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {account.type.replace('_', ' ')}
            </span>
            <span className="font-medium text-gray-900">
              Rp {account.balance.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
        {hasChildren && isExpanded && account.children?.map((child: any) => renderAccount(child, level + 1))}
      </div>
    );
  };

  return (
    <DemoLayout variant="accounting" title="Chart of Accounts (Demo)">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Chart of Accounts</h1>
                <p className="text-gray-600">Daftar Akun Perkiraan (Simulasi)</p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 500); }} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                    <Download className="w-4 h-4" /> Import
                </button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-100">
            <div className="p-4 border-b flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Cari akun..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {['All', 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(filter => (
                        <button 
                            key={filter}
                            onClick={() => setActiveFilter(filter.toLowerCase())}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeFilter === filter.toLowerCase() ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : (
                <div className="divide-y divide-gray-100">
                    {accounts.map(acc => renderAccount(acc))}
                </div>
            )}
        </div>
      </div>
    </DemoLayout>
  );
}
