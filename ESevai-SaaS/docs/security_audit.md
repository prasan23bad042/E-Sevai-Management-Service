# E-Sevai SaaS - Security Audit Report

This document audits the security posture of the E-Sevai SaaS Platform backend, mapping potential vulnerabilities and details of our mitigation implementations.

---

## 1. Access Control Audit

### Vulnerability: Privilege Escalation
- **Risk**: A center manager or staff member accesses platform-level administrative API routes (e.g. approving centers).
- **Mitigation**: Implemented a granular role authorization middleware [roleMiddleware.js](file:///d:/E-Sevai_Saas/ESevai-SaaS/backend/src/middleware/roleMiddleware.js). Roles are verified against the authenticated user database profiles (`platform_admin`, `center_owner`, `manager`, `staff`). Direct updates on roles columns are blocked, and jwt tokens are validated on every endpoint.

### Vulnerability: Insecure Direct Object References (IDOR)
- **Risk**: Staff or managers edit or view applications, documents, or billing receipts belonging to another center by guessing UUIDs.
- **Mitigation**: 
  - Enforced contextual SQL filter constraints in services (e.g. `checkApplicationAccess` in `applicationService.js`, `checkPaymentAccess` in `paymentService.js`).
  - Staff are restricted strictly to application IDs assigned to them.
  - Owners and Managers are limited to center IDs fetched dynamically from their own authenticated profile scopes (`center_staff` or `centers`).

---

## 2. File Upload Hardening

### Vulnerability: Malware Execution via File Upload
- **Risk**: An attacker uploads executable scripts (`.exe`, `.zip`, `.js`, `.php`, `.svg`) as document uploads to run arbitrary code.
- **Mitigation**:
  - Implemented strict extensions and MIME type validation in [documentService.js](file:///d:/E-Sevai_Saas/ESevai-SaaS/backend/src/services/documentService.js).
  - Enforced file buffer verification checking files do not exceed **5MB** for pictures/photos and **10MB** for standard documents.
  - Generates SHA256 hashes for integrity checksum matches on every upload.
  - Predefined scan status (`scan_status = 'pending'`) columns to integrate background scanners (e.g. ClamAV).

---

## 3. Storage & Signed URL Security

### Vulnerability: Leakage of Private Citizens Documents
- **Risk**: Document downloads are public, allowing anyone who guesses the URL path to download sensitive citizen Aadhaar or tax certificates.
- **Mitigation**:
  - All files are uploaded to private, non-public Supabase Storage buckets (`application-documents`, `receipts-documents`).
  - Access to storage objects is protected using temporary signed URLs (`generateSignedUrl` in `storageService.js`) restricted to **5 minutes** (300 seconds) lifetimes.
  - Generates audit events in `activity_logs` whenever a file is downloaded or signed URLs are requested.
