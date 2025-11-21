import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import axios from 'axios';
import { X, Calendar, DollarSign, User, Clock, Receipt, Trash2, AlertCircle, Printer, FileText } from 'lucide-react';
import ConfirmDialog, { ConfirmDialogType } from '../common/ConfirmDialog';

interface Transaction {
  id: number;
  transactionNumber: string;
  orderType: string;
  total: number;
  status: string;
  createdAt: string;
  cashier?: { name: string; email: string };
  table?: { name: string };
  transactionItems: Array<{
    itemName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  payments: Array<{
    method: string;
    amount: number;
    changeAmount?: number;
  }>;
}

interface TransactionHistoryProps {
  onClose: () => void;
}

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to transform backend data to frontend format
const transformTransaction = (data: any): Transaction => {
  return {
    id: data.id,
    transactionNumber: data.transaction_number,
    orderType: data.order_type,
    total: data.total,
    status: data.status,
    createdAt: data.createdAt,
    cashier: data.users ? { name: data.users.name, email: data.users.email } : undefined,
    table: data.tables ? { name: data.tables.name } : undefined,
    transactionItems: (data.transaction_items || []).map((item: any) => ({
      itemName: item.item_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      subtotal: item.subtotal,
    })),
    payments: (data.payments || []).map((payment: any) => ({
      method: payment.method,
      amount: payment.amount,
      changeAmount: payment.change_amount,
    })),
  };
};

export default function TransactionHistory({ onClose }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dateFrom, setDateFrom] = useState(getTodayDate());
  const [dateTo, setDateTo] = useState(getTodayDate());
  const [statusFilter, setStatusFilter] = useState('');

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: ConfirmDialogType;
    title: string;
    message: string;
    details?: Array<{ label: string; value: string }>;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (statusFilter) params.status = statusFilter;

      const { data } = await api.get('/transactions', { params });
      const transformedData = data.data.map(transformTransaction);
      setTransactions(transformedData);
    } catch (error: unknown) {
      console.error('Error loading transactions:', error);
      let errorMessage = 'Failed to load transactions';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, statusFilter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleVoidTransaction = (transaction: Transaction) => {
    setConfirmDialog({
      isOpen: true,
      type: 'warning',
      title: 'Batalkan Transaksi',
      message: 'Apakah Anda yakin ingin membatalkan transaksi ini? Transaksi akan dibatalkan dan stok akan dikembalikan.',
      details: [
        { label: 'No. Transaksi', value: transaction.transactionNumber },
        { label: 'Total', value: `Rp ${Number(transaction.total).toLocaleString('id-ID')}` }
      ],
      confirmText: 'Ya, Batalkan',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await api.put(`/transactions/${transaction.id}/status`, {
            status: 'cancelled'
          });

          toast.success('Transaksi berhasil dibatalkan');
          loadTransactions(); // Reload transactions
          setSelectedTransaction(null); // Clear selection
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error: unknown) {
          console.error('Error voiding transaction:', error);
          let errorMessage = 'Gagal membatalkan transaksi';
          if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
            errorMessage = error.response.data.error.message;
          }
          toast.error(errorMessage);
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: '⚠️ Hapus Transaksi Permanen',
      message: 'Transaksi akan dihapus PERMANEN dari database dan tidak dapat dikembalikan! Stok produk akan dikembalikan jika transaksi sudah selesai.',
      details: [
        { label: 'No. Transaksi', value: transaction.transactionNumber },
        { label: 'Total', value: `Rp ${Number(transaction.total).toLocaleString('id-ID')}` }
      ],
      confirmText: 'Ya, Hapus Permanen',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await api.delete(`/transactions/${transaction.id}`);

          toast.success('Transaksi berhasil dihapus');
          loadTransactions(); // Reload transactions
          setSelectedTransaction(null); // Clear selection
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error: unknown) {
          console.error('Error deleting transaction:', error);
          let errorMessage = 'Gagal menghapus transaksi';
          if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
            errorMessage = error.response.data.error.message;
          }
          toast.error(errorMessage);
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handleUpdateStatus = (transaction: Transaction, newStatus: string) => {
    const statusLabels: { [key: string]: string } = {
      'failed': 'gagal',
      'refund': 'refund'
    };

    const statusConfig: { [key: string]: { type: ConfirmDialogType; title: string } } = {
      'failed': { type: 'warning', title: 'Tandai Gagal' },
      'refund': { type: 'info', title: 'Refund Transaksi' }
    };

    const config = statusConfig[newStatus] || { type: 'info', title: 'Ubah Status' };

    setConfirmDialog({
      isOpen: true,
      type: config.type,
      title: config.title,
      message: `Apakah Anda yakin ingin mengubah status transaksi menjadi ${statusLabels[newStatus]}?`,
      details: [
        { label: 'No. Transaksi', value: transaction.transactionNumber },
        { label: 'Total', value: `Rp ${Number(transaction.total).toLocaleString('id-ID')}` }
      ],
      confirmText: 'Ya, Ubah Status',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await api.put(`/transactions/${transaction.id}/status`, {
            status: newStatus
          });

          toast.success(`Status transaksi berhasil diubah menjadi ${statusLabels[newStatus]}`);
          loadTransactions();
          setSelectedTransaction(null);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error: unknown) {
          console.error('Error updating transaction status:', error);
          let errorMessage = 'Gagal mengubah status transaksi';
          if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
            errorMessage = error.response.data.error.message;
          }
          toast.error(errorMessage);
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handlePrintReceipt = (transaction: Transaction) => {
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) return;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${transaction.transactionNumber}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            max-width: 300px;
            margin: 20px auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
          }
          .header img {
            width: 40px;
            height: 40px;
            margin: 0 auto 5px;
            display: block;
          }
          .header h2 {
            margin: 0;
            font-size: 18px;
          }
          .info {
            margin-bottom: 10px;
            font-size: 12px;
          }
          .items {
            margin: 15px 0;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 10px 0;
          }
          .item {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            font-size: 12px;
          }
          .totals {
            margin-top: 10px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            font-size: 12px;
          }
          .total-row.grand {
            font-weight: bold;
            font-size: 14px;
            border-top: 2px solid #000;
            padding-top: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 11px;
            border-top: 2px dashed #000;
            padding-top: 10px;
          }
          @media print {
            body { margin: 0; padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${window.location.origin}/logo.webp" alt="POS E2NK" />
          <h2>MyPOS</h2>
          <p>Receipt</p>
        </div>

        <div class="info">
          <div><strong>Transaction:</strong> ${transaction.transactionNumber}</div>
          <div><strong>Date:</strong> ${new Date(transaction.createdAt).toLocaleString()}</div>
          <div><strong>Cashier:</strong> ${transaction.cashier?.name || 'N/A'}</div>
          ${transaction.table ? `<div><strong>Table:</strong> ${transaction.table.name}</div>` : ''}
          <div><strong>Order Type:</strong> ${transaction.orderType}</div>
        </div>

        <div class="items">
          ${transaction.transactionItems.map(item => `
            <div class="item">
              <span>${item.quantity}x ${item.itemName}</span>
              <span>Rp ${Number(item.subtotal).toLocaleString('id-ID')}</span>
            </div>
          `).join('')}
        </div>

        <div class="totals">
          <div class="total-row grand">
            <span>TOTAL:</span>
            <span>Rp ${Number(transaction.total).toLocaleString('id-ID')}</span>
          </div>
          ${transaction.payments.map(payment => `
            <div class="total-row">
              <span>${payment.method.toUpperCase()}:</span>
              <span>Rp ${Number(payment.amount).toLocaleString('id-ID')}</span>
            </div>
            ${payment.changeAmount ? `
              <div class="total-row">
                <span>Change:</span>
                <span>Rp ${Number(payment.changeAmount).toLocaleString('id-ID')}</span>
              </div>
            ` : ''}
          `).join('')}
        </div>

        <div class="footer">
          <p>Thank you for your purchase!</p>
          <p>Powered by MyPOS</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
  };

  const handlePrintTodayReport = async () => {
    try {
      const { data } = await api.get('/transactions/today-report');
      const reportData = data.data;

      const reportWindow = window.open('', '_blank');
      if (!reportWindow) return;

      const today = new Date();
      const formattedDate = today.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Laporan Transaksi - ${formattedDate}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 20px auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #333;
              padding-bottom: 15px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #333;
            }
            .header p {
              margin: 5px 0;
              color: #666;
            }
            .info-section {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 8px 0;
            }
            .info-label {
              font-weight: bold;
              color: #555;
            }
            .summary-cards {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .summary-card {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 20px;
              border-radius: 10px;
              text-align: center;
            }
            .summary-card h3 {
              margin: 0 0 10px 0;
              font-size: 14px;
              opacity: 0.9;
            }
            .summary-card .value {
              font-size: 24px;
              font-weight: bold;
            }
            .transactions-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .transactions-table th,
            .transactions-table td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
            }
            .transactions-table th {
              background: #333;
              color: white;
              font-weight: bold;
            }
            .transactions-table tr:nth-child(even) {
              background: #f9f9f9;
            }
            .payment-methods {
              margin-bottom: 30px;
            }
            .payment-method-row {
              display: flex;
              justify-content: space-between;
              padding: 10px;
              border-bottom: 1px solid #eee;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #333;
              color: #666;
              font-size: 12px;
            }
            @media print {
              body { margin: 0; padding: 15px; }
              .summary-cards { page-break-inside: avoid; }
              .transactions-table { page-break-inside: auto; }
              .transactions-table tr { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LAPORAN TRANSAKSI HARIAN</h1>
            <p>${formattedDate}</p>
            <p>MyPOS - Point of Sale System</p>
          </div>

          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Kasir:</span>
              <span>${reportData.cashier?.name || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Waktu Cetak:</span>
              <span>${new Date().toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div class="summary-cards">
            <div class="summary-card">
              <h3>Total Transaksi</h3>
              <div class="value">${reportData.summary.totalTransactions}</div>
            </div>
            <div class="summary-card">
              <h3>Total Penjualan</h3>
              <div class="value">Rp ${Number(reportData.summary.totalSales).toLocaleString('id-ID')}</div>
            </div>
            <div class="summary-card">
              <h3>Rata-rata Transaksi</h3>
              <div class="value">Rp ${Number(reportData.summary.averageTransaction).toLocaleString('id-ID')}</div>
            </div>
          </div>

          <h2>Metode Pembayaran</h2>
          <div class="payment-methods">
            ${Object.entries(reportData.paymentMethods).map(([method, data]: [string, any]) => `
              <div class="payment-method-row">
                <span><strong>${method.toUpperCase()}</strong> (${data.count} transaksi)</span>
                <span><strong>Rp ${Number(data.total).toLocaleString('id-ID')}</strong></span>
              </div>
            `).join('')}
          </div>

          <h2>Detail Transaksi</h2>
          <table class="transactions-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Waktu</th>
                <th>No. Transaksi</th>
                <th>Tipe Order</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.transactions.map((t: any, idx: number) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${new Date(t.createdAt).toLocaleTimeString('id-ID')}</td>
                  <td>${t.transaction_number}</td>
                  <td style="text-transform: capitalize">${t.order_type}</td>
                  <td><strong>Rp ${Number(t.total).toLocaleString('id-ID')}</strong></td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background: #f0f0f0; font-weight: bold;">
                <td colspan="4" style="text-align: right;">TOTAL:</td>
                <td>Rp ${Number(reportData.summary.totalSales).toLocaleString('id-ID')}</td>
              </tr>
            </tfoot>
          </table>

          ${reportData.topItems && reportData.topItems.length > 0 ? `
            <h2>Top 10 Produk Terlaris</h2>
            <table class="transactions-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Nama Produk</th>
                  <th>Quantity Terjual</th>
                  <th>Total Penjualan</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.topItems.map((item: any, idx: number) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>Rp ${Number(item.total).toLocaleString('id-ID')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          <div class="footer">
            <p>Laporan ini dibuat secara otomatis oleh MyPOS</p>
            <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `;

      reportWindow.document.write(reportHTML);
      reportWindow.document.close();
    } catch (error: unknown) {
      console.error('Error printing today report:', error);
      let errorMessage = 'Gagal mencetak laporan hari ini';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[90vw] max-w-5xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="w-6 h-6" />
            Riwayat Transaksi
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintTodayReport}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 flex items-center gap-2 shadow-lg transition-all"
            >
              <FileText className="w-5 h-5" />
              Cetak Laporan Hari Ini
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-blue-50">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Dari Tanggal
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              >
                <option value="">Semua Status</option>
                <option value="completed">Selesai</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Dibatalkan</option>
                <option value="failed">Gagal</option>
                <option value="refund">Refund</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Transaction List */}
          <div className="w-1/2 border-r overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <Clock className="w-8 h-8 animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Receipt className="w-16 h-16 mb-2" />
                <p>Tidak ada transaksi ditemukan</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    onClick={() => setSelectedTransaction(transaction)}
                    className={`p-4 border rounded-lg cursor-pointer hover:bg-blue-50 transition ${
                      selectedTransaction?.id === transaction.id ? 'bg-blue-100 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{transaction.transactionNumber}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(transaction.createdAt).toLocaleDateString()} {new Date(transaction.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">Rp {Number(transaction.total).toLocaleString('id-ID')}</p>
                        <span className={`text-xs px-2 py-1 rounded font-semibold ${
                          transaction.status === 'completed' ? 'bg-green-100 text-green-700' :
                          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          transaction.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          transaction.status === 'failed' ? 'bg-orange-100 text-orange-700' :
                          transaction.status === 'refund' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {transaction.status === 'completed' ? 'Selesai' :
                           transaction.status === 'pending' ? 'Pending' :
                           transaction.status === 'cancelled' ? 'Dibatalkan' :
                           transaction.status === 'failed' ? 'Gagal' :
                           transaction.status === 'refund' ? 'Refund' :
                           transaction.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      {transaction.cashier && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {transaction.cashier.name}
                        </span>
                      )}
                      {transaction.table && (
                        <span>Table: {transaction.table.name}</span>
                      )}
                      <span className="capitalize">{transaction.orderType}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transaction Detail */}
          <div className="w-1/2 overflow-y-auto bg-gray-50">
            {selectedTransaction ? (
              <div className="p-6">
                <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-lg mb-3 text-gray-800">Detail Transaksi</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">No. Transaksi:</span>
                      <span className="font-semibold">{selectedTransaction.transactionNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tanggal & Waktu:</span>
                      <span>{new Date(selectedTransaction.createdAt).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Kasir:</span>
                      <span>{selectedTransaction.cashier?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tipe Order:</span>
                      <span className="capitalize">{selectedTransaction.orderType}</span>
                    </div>
                    {selectedTransaction.table && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Meja:</span>
                        <span>{selectedTransaction.table.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-100">
                  <h3 className="font-bold mb-3 text-gray-800">Item Pesanan</h3>
                  <div className="space-y-2">
                    {selectedTransaction.transactionItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.itemName}</span>
                        <span className="font-semibold">Rp {Number(item.subtotal).toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-100">
                  <h3 className="font-bold mb-3 text-gray-800">Pembayaran</h3>
                  <div className="space-y-2 text-sm">
                    {selectedTransaction.payments.map((payment, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between">
                          <span className="text-gray-600 capitalize">{payment.method}:</span>
                          <span>Rp {Number(payment.amount).toLocaleString('id-ID')}</span>
                        </div>
                        {payment.changeAmount !== undefined && payment.changeAmount > 0 && (
                          <div className="flex justify-between text-gray-600">
                            <span>Kembalian:</span>
                            <span>Rp {Number(payment.changeAmount).toLocaleString('id-ID')}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total:</span>
                      <span className="text-blue-600">Rp {Number(selectedTransaction.total).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handlePrintReceipt(selectedTransaction)}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <Printer className="w-5 h-5" />
                    Cetak Struk
                  </button>

                  {selectedTransaction.status === 'completed' && (
                    <>
                      <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <p className="text-yellow-800">
                          Membatalkan atau menghapus transaksi akan mengembalikan stok produk yang terjual.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleVoidTransaction(selectedTransaction)}
                          className="bg-yellow-500 text-white py-2 rounded-lg font-semibold hover:bg-yellow-600 flex items-center justify-center gap-2 text-sm"
                        >
                          <X className="w-4 h-4" />
                          Batalkan
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(selectedTransaction, 'failed')}
                          className="bg-orange-500 text-white py-2 rounded-lg font-semibold hover:bg-orange-600 flex items-center justify-center gap-2 text-sm"
                        >
                          <AlertCircle className="w-4 h-4" />
                          Tandai Gagal
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleUpdateStatus(selectedTransaction, 'refund')}
                          className="bg-purple-500 text-white py-2 rounded-lg font-semibold hover:bg-purple-600 flex items-center justify-center gap-2 text-sm"
                        >
                          <DollarSign className="w-4 h-4" />
                          Refund
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(selectedTransaction)}
                          className="bg-red-500 text-white py-2 rounded-lg font-semibold hover:bg-red-600 flex items-center justify-center gap-2 text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Hapus
                        </button>
                      </div>
                    </>
                  )}

                  {selectedTransaction.status !== 'completed' && (
                    <>
                      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                        <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-blue-800">
                          Status: <strong>{selectedTransaction.status === 'pending' ? 'Pending' :
                           selectedTransaction.status === 'cancelled' ? 'Dibatalkan' :
                           selectedTransaction.status === 'failed' ? 'Gagal' :
                           selectedTransaction.status === 'refund' ? 'Refund' :
                           selectedTransaction.status}</strong>
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteTransaction(selectedTransaction)}
                        className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-5 h-5" />
                        Hapus Transaksi
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <DollarSign className="w-16 h-16 mb-2" />
                <p>Pilih transaksi untuk melihat detail</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Summary */}
        <div className="p-4 border-t bg-gradient-to-r from-gray-50 to-blue-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-700">
              Total Transaksi: <span className="font-bold text-gray-900">{transactions.length}</span>
            </div>
            <div className="text-sm text-gray-700">
              Total Pendapatan: <span className="font-bold text-blue-600 text-lg">
                Rp {transactions.reduce((sum, t) => sum + parseFloat(t.total.toString()), 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        details={confirmDialog.details}
        confirmText={confirmDialog.confirmText}
        type={confirmDialog.type}
        isLoading={isProcessing}
      />
    </div>
  );
}
