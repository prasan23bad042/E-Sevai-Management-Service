# E-Sevai SaaS - Frontend Architecture Specifications

This document outlines the React+Vite Single Page Application (SPA) architecture, state management patterns, UI layouts, and the role-based route protection matrix.

---

## 1. Directory Structure

The project directory follows a feature-grouped architecture to maintain clean boundaries between components, utilities, state stores, and layout templates:

```
src/
├── assets/             # Brand logos, icons, and static image assets
├── components/         # Global reusable UI design elements
│   ├── ui/             # Radix UI / Shadcn base controls (Button, Input, Dialog, etc.)
│   ├── table/          # Custom DataTable, Pagination, and SearchBar wrappers
│   ├── feedback/       # Loader, EmptyState, Offline Alert, and Status Badges
│   └── layout/         # Shell components: Sidebar, Navbar, and Footer
├── config/             # Connection configurations (Axios, endpoints definition)
├── features/           # Feature modules containing pages and API hooks
│   ├── auth/           # Login, Invitation signup, profile pages
│   ├── centers/        # Center onboarding registration layouts
│   ├── applications/   # Application drafts, details, document checklists
│   ├── payments/       # Billing models, receipt templates, UPI QR screens
│   ├── notifications/  # Alerts, Bell item list components
│   └── reports/        # Data grids, charts widgets, downloads
├── hooks/              # Global custom React hooks (useAuth, useLocalStorage)
├── routes/             # Route Guards, role matrix router, paths definition
├── stores/             # Zustand state management slices
└── utils/              # Text formatting, CSV helper routines, data parsing
```

---

## 2. State Management Strategy (Zustand Stores)

The application uses Zustand for lightweight, high-performance, and non-boilerplate state management:

### Auth Store (`useAuthStore`)
Manages active session JWT token, user profile detail snapshot, and active center context:
```javascript
import create from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setSession: (token, user) => set({ token, user, isAuthenticated: true }),
      clearSession: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    { name: 'e-sevai-auth' }
  )
);
```

### Notifications Store (`useNotificationStore`)
Maintains alerts feed, unread badge count, and polling intervals for center tasks:
```javascript
export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) => set({
    notifications,
    unreadCount: notifications.filter(n => !n.read_at && !n.deleted_at).length
  }),
  markAsRead: (id) => set(state => {
    const updated = state.notifications.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n);
    return {
      notifications: updated,
      unreadCount: updated.filter(n => !n.read_at && !n.deleted_at).length
    };
  }),
  softDelete: (id) => set(state => {
    const updated = state.notifications.map(n => n.id === id ? { ...n, deleted_at: new Date().toISOString() } : n);
    return {
      notifications: updated,
      unreadCount: updated.filter(n => !n.read_at && !n.deleted_at).length
    };
  })
}));
```

### Dashboard Store (`useDashboardStore`)
Caches analytics totals, chart data, and filter status for fast navigation back-and-forth:
```javascript
export const useDashboardStore = create((set) => ({
  stats: null,
  chartsData: [],
  isLoading: false,
  filters: { dateRange: '30d', centerId: 'all' },
  setFilters: (filters) => set(state => ({ filters: { ...state.filters, ...filters } })),
  fetchStats: async (apiCall) => {
    set({ isLoading: true });
    const res = await apiCall();
    set({ stats: res.stats, chartsData: res.charts, isLoading: false });
  }
}));
```

---

## 3. UI Component Layout Specifications

* **App Shell Layout**: A responsive design featuring a persistent collapsible sidebar navigation (left), top horizontal navbar containing the search wrapper and notification bell component, and a central workspace main container.
* **Responsive Layout Grid**:
  - **Desktop**: Grid layouts use standard 12-column systems (e.g., dashboard widgets take `col-span-4`, main application tables take `col-span-12`).
  - **Tablet**: Collapse sidebar to overlay. Widgets scale to `col-span-6` for scannability.
  - **Mobile**: Grid spans collapse to full width `col-span-12`. Navigation displays as a sliding bottom sheet or floating sidebar toggle button.

---

## 4. Role-Based Route Protection Matrix

Access to pages is restricted by client-side route guards validating role tokens inside the authenticated routing tree.

| User Role | Accessible Pages | Restricted Pages | Redirect Rules |
| :--- | :--- | :--- | :--- |
| **platform_admin** | `/admin/*`, `/profile` | `/owner/*`, `/manager/*`, `/staff/*` | Attempts to access tenant pages redirect to `/admin/dashboard` |
| **center_owner** | `/owner/*`, `/applications/*`, `/payments/*`, `/reports/*`, `/profile` | `/admin/*`, `/manager/*`, `/staff/*` | Attempts to access admin pages redirect to `/owner/dashboard` |
| **manager** | `/manager/*`, `/applications/*`, `/payments/*`, `/profile` | `/admin/*`, `/owner/*` (Billing/Settings) | Attempts to access billing settings or admin pages redirect to `/manager/dashboard` |
| **staff** | `/staff/*`, `/applications/create`, `/applications/edit/:id`, `/profile` | `/admin/*`, `/owner/*`, `/manager/*`, `/reports/*` | Attempts to access reports or staff controls redirects to `/staff/dashboard` |

### Route Guard Implementation Wrapper (`ProtectedRoute`)

```jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
```

### Unauthorized Access Screen
When a user attempts to view a restricted page:
- Clean, focused fullscreen overlay message with high-priority warnings layout.
- Displays a `403 Forbidden` visual state card.
- Message: `"Access Denied: You do not have permissions to view this resource. Contact your administrator if you believe this is in error."`
- Action Buttons: `Go back to Dashboard` (directs user back to their respective landing page) or `Switch Account` (logs out current session).
