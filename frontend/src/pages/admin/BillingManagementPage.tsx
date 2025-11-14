import { useState } from 'react';
import { CreditCard, Check, AlertTriangle, Plus, Edit, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  maxOutlets: number;
  maxUsers: number;
  features: string[];
  color: string;
}

interface BillingRecord {
  id: number;
  tenant: string;
  plan: string;
  amount: number;
  paidDate: string;
  nextBilling: string;
  status: 'Paid' | 'Pending' | 'Overdue';
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 1,
    name: 'Basic',
    price: 99000,
    maxOutlets: 1,
    maxUsers: 5,
    features: [
      '1 Outlet',
      'Up to 5 Users',
      'Basic POS Features',
      'Transaction History',
      'Basic Reports',
      'Email Support'
    ],
    color: 'blue'
  },
  {
    id: 2,
    name: 'Pro',
    price: 299000,
    maxOutlets: 5,
    maxUsers: 20,
    features: [
      'Up to 5 Outlets',
      'Up to 20 Users',
      'Advanced POS Features',
      'Transaction History',
      'Advanced Reports & Analytics',
      'Inventory Management',
      'Priority Email Support',
      'WhatsApp Notifications'
    ],
    color: 'purple'
  },
  {
    id: 3,
    name: 'Enterprise',
    price: 999000,
    maxOutlets: 999,
    maxUsers: 999,
    features: [
      'Unlimited Outlets',
      'Unlimited Users',
      'All Premium Features',
      'Custom Integrations',
      'Advanced Analytics',
      'Dedicated Account Manager',
      '24/7 Phone Support',
      'Custom Development'
    ],
    color: 'orange'
  }
];

const billingHistory: BillingRecord[] = [
  {
    id: 1,
    tenant: 'Kebuli Utsman',
    plan: 'Pro',
    amount: 299000,
    paidDate: '2025-11-01',
    nextBilling: '2025-12-01',
    status: 'Paid'
  },
  {
    id: 2,
    tenant: 'Toko Elektronik Jaya',
    plan: 'Enterprise',
    amount: 999000,
    paidDate: '2025-11-05',
    nextBilling: '2025-12-05',
    status: 'Paid'
  },
  {
    id: 3,
    tenant: 'Cafe Kopi Nikmat',
    plan: 'Pro',
    amount: 299000,
    paidDate: '2025-10-15',
    nextBilling: '2025-11-15',
    status: 'Overdue'
  },
  {
    id: 4,
    tenant: 'Warung Sate Pak Eko',
    plan: 'Basic',
    amount: 99000,
    paidDate: '2025-11-10',
    nextBilling: '2025-12-10',
    status: 'Paid'
  },
  {
    id: 5,
    tenant: 'Bakery Roti Enak',
    plan: 'Basic',
    amount: 99000,
    paidDate: '2025-10-20',
    nextBilling: '2025-11-20',
    status: 'Pending'
  }
];

export default function BillingManagementPage() {
  const [activeTab, setActiveTab] = useState<'plans' | 'history' | 'overdue'>('plans');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      Paid: 'bg-green-100 text-green-800',
      Pending: 'bg-yellow-100 text-yellow-800',
      Overdue: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowPlanModal(true);
  };

  const handleAddPlan = () => {
    setSelectedPlan(null);
    setShowPlanModal(true);
  };

  const handleSavePlan = () => {
    toast.success('Plan saved successfully! (Mock)');
    setShowPlanModal(false);
  };

  const overdueRecords = billingHistory.filter(r => r.status === 'Overdue');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Billing Management</h1>
        <p className="text-gray-600">Manage subscription plans and billing</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === 'plans'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Subscription Plans
          </button>
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
      {activeTab === 'plans' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Subscription Plans</h2>
            <button
              onClick={handleAddPlan}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Plan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {subscriptionPlans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white rounded-lg shadow-lg border-2 ${
                  plan.name === 'Pro' ? 'border-purple-500 relative' : 'border-gray-200'
                } p-6`}
              >
                {plan.name === 'Pro' && (
                  <div className="absolute top-0 right-0 bg-purple-500 text-white px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-semibold">
                    Popular
                  </div>
                )}

                <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatCurrency(plan.price)}
                  </span>
                  <span className="text-gray-600">/month</span>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleEditPlan(plan)}
                  className="w-full px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Plan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Billing</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {billingHistory.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{record.tenant}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{record.plan}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                      {formatCurrency(record.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.paidDate}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.nextBilling}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                          {record.tenant}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          Plan: <span className="font-medium">{record.plan}</span> ({formatCurrency(record.amount)}/month)
                        </p>
                        <p className="text-sm text-red-600">
                          Overdue since: <span className="font-medium">{record.nextBilling}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toast.info('Send reminder email (Mock)')}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                      >
                        Send Reminder
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Suspend tenant "${record.tenant}"?`)) {
                            toast.success('Tenant suspended (Mock)');
                          }
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        Suspend
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Auto-Suspend Setting</p>
                    <p className="text-xs text-blue-700">
                      Tenants will be automatically suspended 7 days after payment is overdue
                    </p>
                  </div>
                  <label className="ml-auto flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span className="text-sm text-blue-800">Enable</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {selectedPlan ? 'Edit Plan' : 'Add New Plan'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plan Name</label>
                  <input
                    type="text"
                    defaultValue={selectedPlan?.name}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Pro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Price</label>
                  <input
                    type="number"
                    defaultValue={selectedPlan?.price}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="299000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Outlets</label>
                    <input
                      type="number"
                      defaultValue={selectedPlan?.maxOutlets}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Users</label>
                    <input
                      type="number"
                      defaultValue={selectedPlan?.maxUsers}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePlan}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
