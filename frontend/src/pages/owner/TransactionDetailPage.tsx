import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Receipt, User, Clock, CreditCard, Package, Loader2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import axios from 'axios';

interface TransactionItem {
  id: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discountAmount: number;
  notes?: string;
}

interface Payment {
  id: number;
  method: string;
  amount: number;
  changeAmount?: number;
  status: string;
}

interface Transaction {
  id: number;
  transactionNumber: string;
  orderType: string;
  customerName?: string;
  customerPhone?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceCharge: number;
  total: number;
  status: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
  transactionItems: TransactionItem[];
  payments: Payment[];
  users?: {
    name: string;
  };
}

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/transactions/${id}`);
        setTransaction(response.data.data);
      } catch (error: unknown) {
        console.error('Failed to load transaction:', error);
        let errorMessage = 'Failed to load transaction details';
        if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
          errorMessage = error.response.data.error.message;
        }
        toast.error(errorMessage);
        navigate('/owner/dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTransaction();
    }
  }, [id, navigate]);

  const formatCurrency = (value: number) => {
    const formatted = Math.floor(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `Rp ${formatted}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'refund':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: { [key: string]: string } = {
      cash: 'Cash',
      card: 'Card',
      qris: 'QRIS',
      gofood: 'GoFood',
      grabfood: 'GrabFood',
      shopeefood: 'ShopeeFood',
    };
    return labels[method.toLowerCase()] || method;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading transaction details...</span>
      </div>
    );
  }

  if (!transaction) {
    return null;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/owner/dashboard')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Receipt className="w-6 h-6" />
              Transaction Details
            </h1>
            <p className="text-gray-600 mt-1">{transaction.transactionNumber}</p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(transaction.status)}`}>
            {transaction.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Items
            </h2>
            <div className="space-y-3">
              {transaction.transactionItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start border-b pb-3 last:border-b-0">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{item.itemName}</p>
                    <p className="text-sm text-gray-500">
                      {item.quantity} x {formatCurrency(item.unitPrice)}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-gray-400 mt-1">Note: {item.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(item.subtotal)}</p>
                    {item.discountAmount > 0 && (
                      <p className="text-xs text-red-600">-{formatCurrency(item.discountAmount)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Information
            </h2>
            <div className="space-y-3">
              {transaction.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{getPaymentMethodLabel(payment.method)}</p>
                    {payment.changeAmount && payment.changeAmount > 0 && (
                      <p className="text-xs text-gray-500">Change: {formatCurrency(payment.changeAmount)}</p>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(transaction.subtotal)}</span>
              </div>
              {transaction.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(transaction.discountAmount)}</span>
                </div>
              )}
              {transaction.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">{formatCurrency(transaction.taxAmount)}</span>
                </div>
              )}
              {transaction.serviceCharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service Charge:</span>
                  <span className="font-medium">{formatCurrency(transaction.serviceCharge)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold text-gray-800">Total:</span>
                <span className="font-bold text-blue-600 text-lg">{formatCurrency(transaction.total)}</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Information</h2>
            <div className="space-y-3">
              {transaction.users && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Cashier</p>
                    <p className="font-medium text-gray-800">{transaction.users.name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Created At</p>
                  <p className="font-medium text-gray-800">
                    {new Date(transaction.createdAt).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </p>
                </div>
              </div>
              {transaction.completedAt && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Completed At</p>
                    <p className="font-medium text-gray-800">
                      {new Date(transaction.completedAt).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Receipt className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Order Type</p>
                  <p className="font-medium text-gray-800 capitalize">{transaction.orderType.replace('_', ' ')}</p>
                </div>
              </div>
              {transaction.customerName && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Customer</p>
                    <p className="font-medium text-gray-800">{transaction.customerName}</p>
                    {transaction.customerPhone && (
                      <p className="text-sm text-gray-600">{transaction.customerPhone}</p>
                    )}
                  </div>
                </div>
              )}
              {transaction.notes && (
                <div className="pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{transaction.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
