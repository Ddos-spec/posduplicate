import { create } from 'zustand';
import { notificationService } from '../services/notificationService';
import type { AdminNotification } from '../services/notificationService';
import { useAuthStore } from './authStore';

interface NotificationState {
  notifications: AdminNotification[];
  isPanelOpen: boolean;
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  togglePanel: () => void;
  markAsRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isPanelOpen: false,
  unreadCount: 0,

  fetchNotifications: async () => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        set({ notifications: [], unreadCount: 0 });
        return;
      }
      let response;

      const roleName = (user?.roles?.name || user?.role?.name || '').toLowerCase();
      const isSuperAdmin = roleName === 'super admin' || roleName === 'super_admin';

      if (isSuperAdmin) {
        // Super admins get all system notifications
        response = await notificationService.getAdminNotifications();
      } else {
        // Regular users (owner, cashier) get tenant-specific notifications
        response = await notificationService.getTenantNotifications();
      }

      set({
        notifications: response.data,
        unreadCount: response.count,
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ notifications: [], unreadCount: 0 });
    }
  },

  togglePanel: () => {
    const { isPanelOpen } = get();
    set({ isPanelOpen: !isPanelOpen });
    if (!isPanelOpen) {
      // When opening the panel, mark as read
      set({ unreadCount: 0 });
    }
  },

  markAsRead: () => {
    set({ unreadCount: 0 });
  },
}));
