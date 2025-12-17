import { AlertTriangle, Bell } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import { useThemeStore } from '../../store/themeStore';

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export default function NotificationPanel() {
  const { notifications, isPanelOpen } = useNotificationStore();
  const { isDark } = useThemeStore();

  if (!isPanelOpen) {
    return null;
  }

  return (
    <div className={`absolute top-16 right-4 mt-2 w-80 rounded-xl border shadow-xl z-50 ${
      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
    }`}>
      <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifikasi</h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className={`p-6 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <Bell className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
            <p>Belum ada notifikasi.</p>
            <p className="mt-2 text-xs">
              Contoh: langganan akan habis, tagihan mendekati jatuh tempo.
            </p>
          </div>
        ) : (
          <div className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-gray-200'}`}>
            {notifications.map((notification) => (
              <div key={notification.id} className={`p-4 ${isDark ? 'hover:bg-slate-700/40' : 'hover:bg-gray-50'}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-1 p-1.5 rounded-full ${
                    notification.type === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                      {notification.message}
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {notification.details}
                    </p>
                    <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
