import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { X, Calendar, DollarSign, User, Clock, Receipt } from 'lucide-react';

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

export default function TransactionHistory({ onClose }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadTransactions();
  }, [dateFrom, dateTo, statusFilter]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (statusFilter) params.status = statusFilter;

      const { data } = await api.get('/transactions', { params });
      setTransactions(data.data);
    } catch (error: any) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
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
              <span>Rp ${item.subtotal.toLocaleString()}</span>
            </div>
          `).join('')}
        </div>

        <div class="totals">
          <div class="total-row grand">
            <span>TOTAL:</span>
            <span>Rp ${transaction.total.toLocaleString()}</span>
          </div>
          ${transaction.payments.map(payment => `
            <div class="total-row">
              <span>${payment.method.toUpperCase()}:</span>
              <span>Rp ${payment.amount.toLocaleString()}</span>
            </div>
            ${payment.changeAmount ? `
              <div class="total-row">
                <span>Change:</span>
                <span>Rp ${payment.changeAmount.toLocaleString()}</span>
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[90vw] max-w-5xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="w-6 h-6" />
            Transaction History
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gray-50">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
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
                <p>No transactions found</p>
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
                        <p className="font-bold text-blue-600">Rp {transaction.total.toLocaleString()}</p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          transaction.status === 'completed' ? 'bg-green-100 text-green-700' :
                          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {transaction.status}
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
                <div className="bg-white rounded-lg p-4 mb-4">
                  <h3 className="font-bold text-lg mb-3">Transaction Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaction Number:</span>
                      <span className="font-semibold">{selectedTransaction.transactionNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date & Time:</span>
                      <span>{new Date(selectedTransaction.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cashier:</span>
                      <span>{selectedTransaction.cashier?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Type:</span>
                      <span className="capitalize">{selectedTransaction.orderType}</span>
                    </div>
                    {selectedTransaction.table && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Table:</span>
                        <span>{selectedTransaction.table.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 mb-4">
                  <h3 className="font-bold mb-3">Items</h3>
                  <div className="space-y-2">
                    {selectedTransaction.transactionItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.itemName}</span>
                        <span className="font-semibold">Rp {item.subtotal.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 mb-4">
                  <h3 className="font-bold mb-3">Payment</h3>
                  <div className="space-y-2 text-sm">
                    {selectedTransaction.payments.map((payment, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between">
                          <span className="text-gray-600 capitalize">{payment.method}:</span>
                          <span>Rp {payment.amount.toLocaleString()}</span>
                        </div>
                        {payment.changeAmount !== undefined && payment.changeAmount > 0 && (
                          <div className="flex justify-between text-gray-600">
                            <span>Change:</span>
                            <span>Rp {payment.changeAmount.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total:</span>
                      <span className="text-blue-600">Rp {selectedTransaction.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handlePrintReceipt(selectedTransaction)}
                  className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  <Receipt className="w-5 h-5" />
                  Print Receipt
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <DollarSign className="w-16 h-16 mb-2" />
                <p>Select a transaction to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Summary */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Total Transactions: <span className="font-semibold">{transactions.length}</span>
            </div>
            <div className="text-sm text-gray-600">
              Total Revenue: <span className="font-semibold text-blue-600">
                Rp {transactions.reduce((sum, t) => sum + parseFloat(t.total.toString()), 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
