import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Authorization JWT & Correlation ID
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach UUID as X-Request-ID to trace execution flows in server logs
    let requestId = '';
    try {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
        requestId = window.crypto.randomUUID();
      } else {
        requestId = 'req_' + Math.random().toString(36).substring(2, 15);
      }
    } catch (e) {
      requestId = 'req_' + Date.now();
    }
    
    config.headers['X-Request-ID'] = requestId;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle Global Error States
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Session expiration handling on 401
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().clearSession();
      // Redirect to login if on client side
      if (typeof window !== 'undefined') {
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
