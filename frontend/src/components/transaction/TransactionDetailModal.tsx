import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Clock, User, MessageSquare, Printer, DollarSign } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: number | null;
}

interface Transaction {
  id: number;
  transactionNumber: string;
  orderType: string;
  total: number;
  status: string;
  createdAt: string;
  notes?: string;
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

export default function TransactionDetailModal({
  isOpen,
  onClose,
  transactionId
}: TransactionDetailModalProps) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && transactionId) {
      const fetchTransaction = async () => {
        setLoading(true);
        try {
          const { data } = await api.get(`/transactions/${transactionId}`);
          
          // Transform backend data
          const transformedTransaction: Transaction = {
            id: data.data.id,
            transactionNumber: data.data.transaction_number,
            orderType: data.data.order_type,
            total: data.data.total,
            status: data.data.status,
            notes: data.data.notes,
            createdAt: data.data.created_at || data.data.createdAt,
            cashier: data.data.users ? { name: data.data.users.name, email: data.data.users.email } : undefined,
            table: data.data.tables ? { name: data.data.tables.name } : undefined,
            transactionItems: (data.data.transaction_items || []).map((item: any) => ({
              itemName: item.item_name || item.items?.name,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              subtotal: item.subtotal,
            })),
            payments: (data.data.payments || []).map((payment: any) => ({
              method: payment.method,
              amount: payment.amount,
              changeAmount: payment.change_amount,
            })),
          };

          setTransaction(transformedTransaction);
        } catch (error) {
          console.error('Failed to fetch transaction details:', error);
          toast.error('Gagal memuat detail transaksi');
          onClose();
        } finally {
          setLoading(false);
        }
      };

      fetchTransaction();
    } else {
      setTransaction(null);
    }
  }, [isOpen, transactionId]);

  const handlePrintReceipt = () => {
    if (!transaction) return;
    
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

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                >
                  Detail Transaksi
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Title>

                <div className="mt-4">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Clock className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                  ) : transaction ? (
                    <div className="space-y-4">
                      {/* Transaction Info */}
                      <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">No. Transaksi:</span>
                          <span className="font-semibold">{transaction.transactionNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            transaction.status === 'completed' ? 'bg-green-100 text-green-700' :
                            transaction.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            transaction.status === 'failed' ? 'bg-orange-100 text-orange-700' :
                            transaction.status === 'refund' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {transaction.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tanggal:</span>
                          <span>{new Date(transaction.createdAt).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Kasir:</span>
                          <span>{transaction.cashier?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tipe Order:</span>
                          <span className="capitalize">{transaction.orderType}</span>
                        </div>
                        {transaction.table && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Meja:</span>
                            <span>{transaction.table.name}</span>
                          </div>
                        )}
                        
                        {/* Notes Section */}
                        {transaction.notes && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="flex items-start gap-2 text-gray-700 italic">
                               <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                               <div className="whitespace-pre-wrap">{transaction.notes}</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Items */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b text-sm font-semibold text-gray-700">
                          Item Pesanan
                        </div>
                        <div className="p-4 space-y-2">
                          {transaction.transactionItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.itemName}</span>
                              <span className="font-semibold">Rp {Number(item.subtotal).toLocaleString('id-ID')}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Totals */}
                      <div className="bg-blue-50 p-4 rounded-lg space-y-2 text-sm">
                        {transaction.payments.map((payment, idx) => (
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
                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-blue-200">
                          <span>Total:</span>
                          <span className="text-blue-600">Rp {Number(transaction.total).toLocaleString('id-ID')}</span>
                        </div>
                      </div>

                      <button
                        onClick={handlePrintReceipt}
                        className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 flex items-center justify-center gap-2 shadow-md transition-all"
                      >
                        <Printer className="w-5 h-5" />
                        Cetak Struk
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <DollarSign className="w-16 h-16 mb-2" />
                      <p>Transaksi tidak ditemukan</p>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
