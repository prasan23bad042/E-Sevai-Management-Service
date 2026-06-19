import { create } from 'zustand';
import apiClient from '../services/apiClient';

export interface NotificationItem {
  id: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  read_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  softDelete: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const response = await apiClient.get('/notifications');
      const data: NotificationItem[] = response.data.data || [];
      const active = data.filter(n => !n.deleted_at);
      const unread = active.filter(n => !n.read_at).length;
      set({ notifications: active, unreadCount: unread });
    } catch (e) {
      // Quiet fail or placeholder
    } finally {
      set({ loading: false });
    }
  },
  markAsRead: async (id) => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      const updated = get().notifications.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n);
      set({
        notifications: updated,
        unreadCount: updated.filter(n => !n.read_at && !n.deleted_at).length
      });
    } catch (e) {}
  },
  markAllAsRead: async () => {
    try {
      // Execute global read updates
      await apiClient.put(`/notifications/read-all`);
      const updated = get().notifications.map(n => ({ ...n, read_at: new Date().toISOString() }));
      set({ notifications: updated, unreadCount: 0 });
    } catch (e) {}
  },
  softDelete: async (id) => {
    try {
      await apiClient.delete(`/notifications/${id}`);
      const updated = get().notifications.filter(n => n.id !== id);
      set({
        notifications: updated,
        unreadCount: updated.filter(n => !n.read_at).length
      });
    } catch (e) {}
  }
}));
