# E-Sevai SaaS - End-to-End System Testing & QA Report

This document details the system-wide verification, realistic data seeding plans, end-to-end (E2E) verification workflows, role permission metrics matrices, and load testing benchmarks for the E-Sevai SaaS Platform.

---

## 1. Realistic Data Seeding Profile Estimates

To support comprehensive end-to-end validation, performance benchmarking, and frontend mock representation, the test database is pre-seeded with the following profile estimates:

| Data Entity | Seed Estimate | Description / Details |
| :--- | :--- | :--- |
| **Services Catalog** | 25 Services | Standard Government Services (Income, Community, Nativity certificates, etc.) with configurable SLA days, fee structures, and document checklists. |
| **Applications** | 100 Applications | Spread across various states (`draft`, `submitted`, `assigned`, `document_verified`, `manager_approved`, `completed`, `rejected`). |
| **Documents Checklist** | 300 Documents | Uploaded PDFs and images mapped to individual applications, supporting multiple version histories and verification logs. |
| **Payments** | 100 Payments | Offline cash collection and simulated online UPI transactions with snapshots of active service fees. |
| **Notifications** | 500 Notifications | Role-targeted notifications ranging across priorities (`low` to `critical`) and categories (`application`, `document`, `payment`, `staff`, `center`, `system`). |

---

## 2. Role Permission Metrics Matrix

The backend enforces strict Role-Based Access Control (RBAC). The following matrix details the API access permissions across the system:

| API Scope / Resource | platform_admin | center_owner | manager | staff |
| :--- | :---: | :---: | :---: | :---: |
| **Center Creation & Approval** | **Full** (Create & Approve) | **Write** (Submit application) | *None* | *None* |
| **Staff Invitation & Onboarding** | **Read Only** | **Full** (Invite/Revoke) | **Write** (Invite staff only) | *None* |
| **Services Catalog Mgmt** | **Full** (Global configuration) | **Read Only** | **Read Only** | **Read Only** |
| **Application Submission** | *None* | **Full** (For own center) | **Full** (For own center) | **Full** (For own center) |
| **Application Assignment** | *None* | **Full** (Assign to staff) | **Full** (Assign to staff) | *None* |
| **Document Verification** | *None* | **Full** (Verify/Reject) | **Full** (Verify/Reject) | **Write** (Upload & Review) |
| **Payment Collection** | *None* | **Full** (Collect offline/UPI) | **Full** (Collect offline/UPI) | **Full** (Collect offline/UPI) |
| **Notification Settings** | **Full** (System level) | **Full** (Center level) | **Write** (Own read states) | **Write** (Own read states) |
| **Reports Download** | **Full** (Global/Tenant data) | **Full** (Center performance) | **Full** (Center performance) | *None* |

---

## 3. End-to-End (E2E) Flow Validations

### Flow 1: Admin Workflow (Center Creation & Approval)
1. **Initiate Center Onboarding**: An operator submits a new center signup request via `/api/v1/centers/register` containing center details, owner info, and PAN/License uploads.
2. **Review Pending Centers**: A Platform Admin logs in, calls `/api/v1/centers/pending` to view outstanding registration requests.
3. **Approve Center**: Platform Admin issues a `PATCH` request to `/api/v1/centers/:id/approve`. This transitions the center status to `active` and generates an invitation token for the center owner.
4. **Owner Registration**: Center Owner uses the token to complete registration via `/api/v1/auth/signup/tenant`.

### Flow 2: Staff Onboarding Workflow (Owner -> Manager -> Staff)
1. **Invite Manager/Staff**: Center Owner sends a staff invitation via `/api/v1/staff/invite` specifying email and role (`manager` or `staff`).
2. **Manager Onboarding**: The invited user accepts the invitation using the signup token `/api/v1/auth/signup/staff`, creating a `manager` account.
3. **Manager Invites Staff**: The new Manager invites another staff member. The invite gets logged.
4. **Staff Activation**: Staff completes signup, establishing the complete center operations tree.

### Flow 3: Applications Checklist Lifecycle
1. **Select Service**: Citizen selects an "Income Certificate" from the catalog `/api/v1/services`.
2. **Draft Application**: Staff initiates an application via `/api/v1/applications/draft` with citizen demographic details.
3. **Generate Checklist**: The backend automatically reads the service catalog details, generating a checklist of required documents (e.g., Aadhaar Card, PAN, Salary Slip) mapped to the application.
4. **SLA Assignment**: SLA due date is auto-calculated based on service SLA configurations (e.g., 15 days).

### Flow 4: Documents Upload & Verification Loop
1. **Document Upload**: Staff/Citizen uploads Aadhaar via `/api/v1/applications/:id/documents` mapping to `aadhaar_card` checklist requirement.
2. **Checklist Validation**: Backend validates that `aadhaar_card` is an outstanding required document and checks file type (PDF/JPG) and size (< 5MB).
3. **Staff Review**: Staff reviews the uploaded document. Marks it as `verified` or `rejected` via `/api/v1/documents/:id/verify`.
4. **Rejection Resubmission**: If rejected, a notification is sent, allowing the citizen/staff to upload a corrected version. The previous version is archived in document history.

### Flow 5: Payment Cash/UPI Collection & Receipt Generation
1. **Fee Calculation**: Application moves to `pending_payment`. Backend computes Government Fee (₹100) + Service Charge (₹50) = Total (₹150).
2. **Payment Execution**:
   - **Cash Option**: Staff collects cash offline, records `/api/v1/payments/collect` with `payment_method = cash`, `cash_received = 200`, and `balance_returned = 50`.
   - **UPI Option**: Staff displays UPI QR code, checks transaction success, and records `/api/v1/payments/collect` with `payment_method = upi` and `transaction_reference = TXN987654321`.
3. **Snapshot Capture**: Payment record captures a static snapshot of the fee structure (fees may change globally but historical receipt remains ₹150).
4. **Receipt Generation**: Backend generates a secure PDF/HTML receipt containing QR codes, digital signatures, and application tracking numbers.

### Flow 6: CSV/Excel Reporting Downloads
1. **Request Report**: Center Owner requests a revenue and application count report via `/api/v1/reports/revenue` specifying date range and formats.
2. **Export Processing**: Backend queries aggregated database stats.
3. **UTF-8 BOM Output**: Backend outputs CSV stream formatted with UTF-8 Byte Order Mark (BOM) to prevent Excel parsing distortion of local language/currency characters.
4. **Download**: Secure download link `/api/v1/reports/download/:report_token` serves the stream.

### Flow 7: Notifications Read/Unread/Soft-Delete Cleans
1. **Alert Broadcast**: Application assignment triggers a `medium` priority `application` notification to the assigned staff member.
2. **List Notifications**: Staff pulls active alerts from `/api/v1/notifications` (default returns unread items).
3. **Mark Read**: Staff marks notification as read via `/api/v1/notifications/:id/read`.
4. **Soft Delete**: User archives/deletes alert via `/api/v1/notifications/:id`. The system performs a soft-delete (`deleted_at` timestamp is set), ensuring audit trail integrity while clearing the user dashboard view.

---

## 4. Load Testing Plan Benchmarks

To ensure the Node.js Express server and Supabase backend can scale under peak workloads (e.g., peak certificate submission season), we validate system responsiveness against three target load categories:

### Load Benchmarks Targets

| Benchmark Profile | Concurrent Users | Targeted RPS (Req/Sec) | Max Acceptable Latency | Core Endpoint Tested |
| :--- | :--- | :--- | :--- | :--- |
| **Light Load** | 100 Users | ~50 RPS | < 150ms | `/api/v1/services` |
| **Medium Peak** | 500 Users | ~200 RPS | < 300ms | `/api/v1/applications/list` |
| **Heavy Stress** | 1,000 Users | ~450 RPS | < 600ms | `/api/v1/reports/revenue` |

### Key Optimization Measures Tested
1. **Database Indexing**: Ensures indexing on `center_id`, `application_status`, `user_id`, and `created_at` timestamps prevents sequential table scans under concurrent loads.
2. **Connection Pooling**: Verified Supabase database pool handles transient surges without socket starvation.
3. **Query Throttling**: Rate limiters enforce client limits per IP to protect server resource limits.
