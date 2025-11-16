export const subscriptionPlans = [
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
