import { useNotificationStore } from '../../store/notificationStore';
import { Link } from 'react-router-dom';
import { Bell, AlertTriangle } from 'lucide-react';

export default function NotificationPanel() {
  const { notifications, isPanelOpen } = useNotificationStore();

  if (!isPanelOpen) {
    return null;
  }

  return (
    <div className="absolute top-16 right-4 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 border">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No new notifications</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map(notification => (
              <Link
                key={notification.id}
                to={`/admin/tenants?search=${notification.tenantId}`} // Simple link to tenant page
                className="block p-4 hover:bg-gray-50"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 p-1.5 rounded-full ${
                    notification.type === 'overdue' ? 'bg-red-100' : 'bg-yellow-100'
                  }`}>
                    <AlertTriangle className={`w-5 h-5 ${
                      notification.type === 'overdue' ? 'text-red-600' : 'text-yellow-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{notification.details}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="p-2 bg-gray-50 text-center border-t">
        <Link to="/admin/billing" className="text-sm font-medium text-blue-600 hover:underline">
          View All Billings
        </Link>
      </div>
    </div>
  );
}
