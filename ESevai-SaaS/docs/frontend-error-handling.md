# E-Sevai SaaS - Frontend Error Handling Standards

This document establishes the error-handling patterns, fallback strategies, and UI behavior rules to guarantee consistent, production-grade user experiences when APIs fail or network limits are exceeded.

---

## 1. Error Categories and UI Treatment

| Error Category | Root Cause | Target UI Component | User Experience (UX) Reaction |
| :--- | :--- | :--- | :--- |
| **API Validation Errors** | Parameter mismatch, bad format, field length violations. | Inline forms and helper text inputs. | Highlight input boxes in warning borders, display specific text below fields, and suppress page form submit buttons. |
| **Network Loss / Offline** | Drop in citizen/staff connectivity (checked via `navigator.onLine`). | Fixed banner overlay + global toaster alerts. | Mount a non-intrusive floating status banner at the top of the interface: `"Offline Mode: Local drafts cached. Reconnecting when internet resumes."` |
| **Request Timeout** | Server query takes >15s to respond. | Modal popups / Page sections. | Display a retry modal: `"The request timed out due to poor connectivity. Would you like to try again?"` with loading spinner. |
| **Permission Denied** | 403 Forbidden attempts. | Blocked routes page shell. | Redirect to the Unauthorized Access overlay page showing restriction logs. |
| **Browser Storage Full** | Local storage full, preventing Zustand cache. | Dialog / Toaster warning. | Display a warning toast: `"Device storage is full. Drafts will not be saved locally."` |
| **Notification Failure** | SSE or WebSockets polling timeouts. | Notification icon status. | Quietly display a small warning dot on the bell icon and retry connection every 60 seconds. |

---

## 2. Global Axios Catch Interceptor

To avoid duplicate try-catch wrappers, the application uses an Axios response interceptor that translates HTTP status codes into user-friendly notifications:

```javascript
import { toast } from 'react-hot-toast';

export const handleApiError = (error) => {
  const requestId = error.response?.data?.request_id || 'N/A';
  
  if (!navigator.onLine) {
    toast.error('Network disconnected. Please check your internet connection.');
    return;
  }

  if (error.code === 'ECONNABORTED') {
    toast.error('The request timed out. Please try executing the action again.');
    return;
  }

  const errorData = error.response?.data?.error;
  const status = error.response?.status;

  switch (status) {
    case 400:
      if (errorData?.code === 'VALIDATION_FAILED') {
        // Validation errors are handled inline inside forms
        break;
      }
      toast.error(errorData?.message || 'Invalid Request parameters submitted.');
      break;
    case 401:
      toast.error('Session expired. Please log in again.');
      break;
    case 403:
      toast.error('Access Denied: You do not have permissions for this action.');
      break;
    case 404:
      toast.error('The requested resource was not found on our servers.');
      break;
    case 500:
    case 502:
    case 503:
      toast.error(`Internal server error. Support ID: ${requestId}`);
      break;
    default:
      toast.error('An unexpected error occurred. Please try again.');
  }
};
```

---

## 3. Inline Input Form Validation

For user registration, center signup, or application submissions, the frontend uses React Hook Form + Zod. Errors do not rely on toaster alerts; instead, they are rendered inline:

1. **Focus Management**: The page auto-scrolls to focus on the first input containing errors.
2. **Visual Hierarchy**: Inputs change border colors to crimson HSL variables.
3. **Accessibility**: Form controls feature `aria-invalid="true"` and reference descriptive helper elements with `aria-describedby` matching the Zod schema text.
