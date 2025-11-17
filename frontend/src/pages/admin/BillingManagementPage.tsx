import { useState, useEffect } from 'react';
import { Check, AlertTriangle, FileDown, Loader2, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { billingService } from '../../services/billingService';
import type { BillingRecord, BillingStats } from '../../services/billingService';

export default function BillingManagementPage() {
  const [activeTab, setActiveTab] = useState<'history' | 'overdue'>('history');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BillingRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // API State
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [stats, setStats] = useState<BillingStats>({
    totalRevenue: 0,
    activeSubscriptions: 0,
    expiringSoon: 0,
    overduePayments: 0
  });

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: 'bank_transfer',
    referenceNumber: ''
  });

  // Fetch all billing data
  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const [historyRes, statsRes] = await Promise.all([
        billingService.getHistory(),
        billingService.getStats()
      ]);

      setBillingRecords(historyRes.data);
      setStats(statsRes.data);
    } catch (error: unknown) {
      console.error('Error fetching billing data:', error);
      let errorMessage = 'Failed to load billing data';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      trial: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleRecordPayment = async () => {
    if (!selectedRecord) return;

    try {
      await billingService.recordPayment({
        tenantId: selectedRecord.id,
        amount: paymentForm.amount,
        method: paymentForm.method,
        referenceNumber: paymentForm.referenceNumber || undefined
      });

      toast.success('Payment recorded successfully!');
      setShowPaymentModal(false);
      setSelectedRecord(null);
      setPaymentForm({ amount: 0, method: 'bank_transfer', referenceNumber: '' });
      fetchBillingData();
    } catch (error: unknown) {
      console.error('Error recording payment:', error);
      let errorMessage = 'Failed to record payment';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    }
  };

  const openPaymentModal = (record: BillingRecord) => {
    setSelectedRecord(record);
    setShowPaymentModal(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const isOverdue = (record: BillingRecord) => {
    if (!record.subscriptionExpiresAt) return false;
    const expiryDate = new Date(record.subscriptionExpiresAt);
    const today = new Date();
    return expiryDate < today && record.subscriptionStatus !== 'active';
  };

  const overdueRecords = billingRecords.filter(r => isOverdue(r));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading billing data...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Billing Management</h1>
        <p className="text-gray-600">Manage subscription plans and billing</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.totalRevenue)}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Active Subscriptions</p>
            <Check className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.activeSubscriptions}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Expiring Soon</p>
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.expiringSoon}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Overdue Payments</p>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.overduePayments}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Billing History
          </button>
          <button
            onClick={() => setActiveTab('overdue')}
            className={`px-4 py-2 font-medium border-b-2 transition relative ${
              activeTab === 'overdue'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Overdue
            {overdueRecords.length > 0 && (
              <span className="absolute -top-1 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {overdueRecords.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'history' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Billing History</h2>
            <button
              onClick={() => toast.success('Export to Excel (Mock)')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <FileDown className="w-5 h-5" />
              Export to Excel
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Starts At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Billing</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {billingRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{record.businessName}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{record.subscriptionPlan}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(record.subscriptionStartsAt)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(record.subscriptionExpiresAt)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(record.nextBillingDate)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(record.subscriptionStatus)}`}>
                        {record.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openPaymentModal(record)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Record Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {billingRecords.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No billing records found
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'overdue' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Overdue Subscriptions</h2>

          {overdueRecords.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">All Caught Up!</h3>
              <p className="text-green-700">No overdue subscriptions at the moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {overdueRecords.map((record) => (
                <div
                  key={record.id}
                  className="bg-white border-l-4 border-red-500 rounded-lg shadow p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-red-100 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">
                          {record.businessName}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          Plan: <span className="font-medium">{record.subscriptionPlan}</span>
                        </p>
                        <p className="text-sm text-red-600">
                          Expired on: <span className="font-medium">{formatDate(record.subscriptionExpiresAt)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openPaymentModal(record)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        Record Payment
                      </button>
                      <button
                        onClick={() => toast.success('Send reminder feature coming soon')}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                      >
                        Send Reminder
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Record Payment</h2>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Tenant</p>
                <p className="text-lg font-semibold text-gray-800">{selectedRecord.businessName}</p>
                <p className="text-sm text-gray-600 mt-2">Plan: {selectedRecord.subscriptionPlan}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="500000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number (Optional)</label>
                  <input
                    type="text"
                    value={paymentForm.referenceNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="TRX123456"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedRecord(null);
                    setPaymentForm({ amount: 0, method: 'bank_transfer', referenceNumber: '' });
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
