import { create } from 'zustand';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'platform_admin' | 'center_owner' | 'manager' | 'staff';
  tenant_id: string | null;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  setSession: (token: string, user: UserProfile) => void;
  clearSession: () => void;
  checkSession: () => Promise<void>;
}

// Load initial state from browser storage if present
const storedToken = localStorage.getItem('e_sevai_token');
const storedUser = localStorage.getItem('e_sevai_user');

export const useAuthStore = create<AuthState>((set, get) => ({
  token: storedToken,
  user: storedUser ? JSON.parse(storedUser) : null,
  isAuthenticated: !!storedToken,
  isInitializing: !!storedToken,
  setSession: (token, user) => {
    localStorage.setItem('e_sevai_token', token);
    localStorage.setItem('e_sevai_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true, isInitializing: false });
  },
  clearSession: () => {
    localStorage.removeItem('e_sevai_token');
    localStorage.removeItem('e_sevai_user');
    set({ token: null, user: null, isAuthenticated: false, isInitializing: false });
  },
  checkSession: async () => {
    const token = get().token;
    if (!token) {
      set({ isInitializing: false });
      return;
    }
    try {
      const apiClient = (await import('../services/apiClient')).default;
      const response = await apiClient.get('/auth/me');
      const user = response.data.data.user;
      localStorage.setItem('e_sevai_user', JSON.stringify(user));
      set({ user, isAuthenticated: true, isInitializing: false });
    } catch (e) {
      localStorage.removeItem('e_sevai_token');
      localStorage.removeItem('e_sevai_user');
      set({ token: null, user: null, isAuthenticated: false, isInitializing: false });
    }
  }
}));
