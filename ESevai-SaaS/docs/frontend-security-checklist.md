# E-Sevai SaaS - Frontend Security Checklist

This checklist documents the security standards, data protection measures, and token storage procedures implemented on the frontend application client to block cross-site scripting (XSS), cross-site request forgery (CSRF), and unauthorized data access.

---

## 1. Security Control Inventory

### Token Storage (localStorage vs HttpOnly Cookies)
- **Standard**: Session JWTs are stored in short-lived browser memory (Zustand state).
- **Fallback**: For session persistence across page refreshes, the application uses an **HttpOnly, Secure, SameSite=Strict** cookie set by the backend `/auth/login` response headers.
- **Why**: Avoids storing sensitive credentials inside `localStorage` or `sessionStorage` where malicious XSS scripts can fetch token strings via `document.cookie` or standard lookup APIs.

### Route Guards & Client-Side Verification
- **Standard**: Every private path in the React Router is wrapped in a `ProtectedRoute` component.
- **Permissions Check**: Guards do not just check if a user is authenticated, they validate the `user.role` array claims. If the user attempts path tampering, routes auto-redirect to `/unauthorized` and log access violations to the backend audit trails.

### File Upload Sanitation and Checks
- **MIME & Extension Inspections**: Before sending files to `/api/v1/applications/:id/documents`, the client UI inspects:
  - File extension (Only `.pdf`, `.jpg`, `.jpeg`, `.png` are accepted).
  - Magic byte binary checks or MIME-type verification (e.g. `application/pdf`, `image/jpeg`).
- **File Size Checks**: File sizes are checked on client side (< 5MB) to prevent network resource starvation before uploading.

### Cross-Site Scripting (XSS) Prevention
- **HTML Sanitization**: React automatically escapes variables rendered in the JSX virtual DOM (e.g. `{citizen_name}`).
- **Dangerous HTML Suppression**: Use of `dangerouslySetInnerHTML` is banned. Any HTML text (such as custom service bulletins or announcements) is processed through `dompurify` prior to render:
  ```javascript
  import DOMPurify from 'dompurify';
  const cleanHtml = DOMPurify.sanitize(bulletinContent);
  ```

### Handling Sensitive Data Exposure
- **PII Shielding**: Citizen Aadhaar numbers and bank details are masked on the UI (e.g., `XXXX-XXXX-1234`).
- **Cache Cleanups**: Log out routines explicitly clear Zustand memory states, reset dashboard cache tables, and wipe temporary document object URLs (`URL.revokeObjectURL`) to prevent subsequent users on shared terminals from viewing cached customer records.

---

## 2. Developer Action Security Checklist

- [ ] Ensure `VITE_API_BASE_URL` uses SSL/TLS (`https://`) in all staging and production `.env` files.
- [ ] Verify that the file upload inputs explicitly declare `accept="application/pdf,image/png,image/jpeg"`.
- [ ] Inspect all external markdown renderer elements to ensure they filter output using a sanitizer library.
- [ ] Confirm that the logout routine triggers cookie deletion and state purge simultaneously.
- [ ] Check console statement rules in Vite configuration (`minify: 'terser'` or rollup configurations to strip `console.log` statements in production).
- [ ] Verify that no JWT parameters are logged to external telemetry or performance monitoring endpoints.
