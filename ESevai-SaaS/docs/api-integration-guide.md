# E-Sevai SaaS - API Integration & Axios Services Guide

This guide details the Axios client setup, request correlation forwarding, auth interceptors, and services abstractions mapping to the backend endpoint scopes.

---

## 1. Axios Client Configuration (`src/config/apiClient.js`)

We initialize an Axios client that manages authorization headers, injects correlation tracing IDs, and parses error structures globally:

```javascript
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { v4 as uuidv4 } from 'uuid';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 15000, // 15 seconds network timeout
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
    config.headers['X-Request-ID'] = uuidv4();

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
    // Session expiration handling
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().clearSession();
      window.location.href = '/login?expired=true';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 2. API Service Abstractions

Services are grouped by functional scopes matching the backend controllers:

### Authentication Scope (`src/services/authService.js`)
```javascript
import apiClient from '../config/apiClient';

export const authService = {
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },
  signupStaff: async (token, userData) => {
    const response = await apiClient.post(`/auth/signup/staff?token=${token}`, userData);
    return response.data;
  },
  signupTenant: async (token, tenantData) => {
    const response = await apiClient.post(`/auth/signup/tenant?token=${token}`, tenantData);
    return response.data;
  },
  getProfile: async () => {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  }
};
```

### Center Management Scope (`src/services/centerService.js`)
```javascript
import apiClient from '../config/apiClient';

export const centerService = {
  register: async (centerData) => {
    const response = await apiClient.post('/centers/register', centerData);
    return response.data;
  },
  getPending: async () => {
    const response = await apiClient.get('/centers/pending');
    return response.data;
  },
  approve: async (centerId) => {
    const response = await apiClient.patch(`/centers/${centerId}/approve`);
    return response.data;
  },
  listCenters: async () => {
    const response = await apiClient.get('/centers');
    return response.data;
  }
};
```

### Staff Management Scope (`src/services/staffService.js`)
```javascript
import apiClient from '../config/apiClient';

export const staffService = {
  invite: async (email, role) => {
    const response = await apiClient.post('/staff/invite', { email, role });
    return response.data;
  },
  getStaffMembers: async () => {
    const response = await apiClient.get('/staff');
    return response.data;
  },
  revokeInvite: async (inviteId) => {
    const response = await apiClient.delete(`/staff/invitations/${inviteId}`);
    return response.data;
  }
};
```

### Application Lifecycle Scope (`src/services/appService.js`)
```javascript
import apiClient from '../config/apiClient';

export const appService = {
  createDraft: async (serviceId, citizenDetails) => {
    const response = await apiClient.post('/applications/draft', { serviceId, citizenDetails });
    return response.data;
  },
  getById: async (id) => {
    const response = await apiClient.get(`/applications/${id}`);
    return response.data;
  },
  list: async (filters = {}) => {
    const response = await apiClient.get('/applications', { params: filters });
    return response.data;
  },
  assign: async (id, staffId) => {
    const response = await apiClient.patch(`/applications/${id}/assign`, { staffId });
    return response.data;
  },
  updateStatus: async (id, status, notes) => {
    const response = await apiClient.patch(`/applications/${id}/status`, { status, notes });
    return response.data;
  }
};
```

### Document Management Scope (`src/services/docService.js`)
```javascript
import apiClient from '../config/apiClient';

export const docService = {
  upload: async (appId, docType, file) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', docType);

    const response = await apiClient.post(`/applications/${appId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  verify: async (docId, status, rejectionReason = '') => {
    const response = await apiClient.patch(`/documents/${docId}/verify`, { status, rejectionReason });
    return response.data;
  },
  download: async (docId) => {
    // Endpoint returns secured file stream download link
    return apiClient.defaults.baseURL + `/documents/${docId}/download`;
  }
};
```

### Payment Collection Scope (`src/services/paymentService.js`)
```javascript
import apiClient from '../config/apiClient';

export const paymentService = {
  collect: async (appId, paymentData) => {
    const response = await apiClient.post(`/payments/collect`, { appId, ...paymentData });
    return response.data;
  },
  getReceiptUrl: async (paymentId) => {
    return apiClient.defaults.baseURL + `/payments/${paymentId}/receipt`;
  }
};
```

### Reports & Notifications Scope (`src/services/reportsService.js`)
```javascript
import apiClient from '../config/apiClient';

export const reportsService = {
  getRevenue: async (startDate, endDate) => {
    const response = await apiClient.get('/reports/revenue', { params: { startDate, endDate } });
    return response.data;
  },
  getNotifications: async () => {
    const response = await apiClient.get('/notifications');
    return response.data;
  },
  readNotification: async (id) => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },
  deleteNotification: async (id) => {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.data;
  }
};
```
