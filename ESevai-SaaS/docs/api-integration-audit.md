# E-Sevai SaaS - API Integration Audit

This audit evaluates the frontend Single Page Application (SPA) components and identifies data type structures, response payload shapes, and missing endpoints integrations to prepare for connecting to the `/api/v1` backend service.

---

## 1. Authentication & Session Recovery

* **Current Implementation**: On mount, the frontend checks `localStorage` for `e_sevai_token` and `e_sevai_user`. It restores state based on the cached string payload.
* **Backend Endpoint**: `GET /api/v1/auth/me`
* **Discrepancy**: If the backend database updates role permissions or invitation statuses, the frontend cached local storage copy remains stale.
* **Action Plan**:
  - Implement a session sync hook on mount inside `App.tsx` or `main.tsx`.
  - Dispatch a request to `/api/v1/auth/me` on startup to verify session validity and update user metadata contexts.

---

## 2. Dashboard Integration Audits

The frontend is currently mapping incorrect metrics attributes compared to what the backend analytics controllers dispatch:

### Admin Dashboard (`GET /api/v1/dashboard/admin`)

| Metric / Table | Frontend Expected Variable | Backend Payload Structured Path |
| :--- | :--- | :--- |
| **Total Centers** | `data.totalCenters` | `data.centers.total` |
| **Pending Approvals** | `data.pendingCenters` | `data.centers.pending` |
| **Global Applications** | `data.totalApplications` | `data.applications.total` |
| **Services catalog** | `data.totalServices` | `data.topServices.length` (or catalog length) |
| **Review Queue List** | `data.pendingCentersList` | `data.pendingCentersList` (needs array verification) |

---

### Center Owner Dashboard (`GET /api/v1/dashboard/owner`)

| Metric / Table | Frontend Expected Variable | Backend Payload Structured Path |
| :--- | :--- | :--- |
| **Active Staff** | `data.stats.activeStaffCount` | `data.active_staff` |
| **Applications Count** | `data.stats.totalAppsCount` | `data.applications.pending` |
| **Revenue Box** | `data.stats.revenueCollected` | `data.revenue.month.total_revenue` |
| **Unpaid Invoices** | `data.stats.pendingPaymentsCount` | `data.verification_queue_length` (or unpaid count) |
| **Recent Applications** | `data.recentApplications` | `data.recentApplications` (array verification) |

---

### Operations Manager Dashboard (`GET /api/v1/dashboard/manager`)

| Metric / Table | Frontend Expected Variable | Backend Payload Structured Path |
| :--- | :--- | :--- |
| **Team Staff Count** | `data.stats.staffCount` | `data.applications.assigned_total` (check service maps) |
| **Unassigned Queue** | `data.stats.unassignedApps` | `data.applications.assigned_total` (unassigned details) |
| **Pending Reviews** | `data.stats.pendingReviewsCount` | `data.pending_document_reviews` |
| **SLA Warnings** | `data.stats.slaBreachCount` | `data.rejected_documents_count` |
| **Documents Table** | `data.pendingReviewsList` | `data.pendingReviewsList` |

---

### Staff Operator Dashboard (`GET /api/v1/dashboard/staff`)

| Metric / Table | Frontend Expected Variable | Backend Payload Structured Path |
| :--- | :--- | :--- |
| **Assigned Tasks** | `data.stats.assignedCount` | `data.assigned_applications` |
| **Work Drafts** | `data.stats.draftsCount` | `data.pending_applications` |
| **Pending Uploads** | `data.stats.awaitingUploads` | `data.pending_applications` (matching checklist uploads) |
| **Recent Alerts** | `data.stats.activeAlerts` | `data.today_activity_timeline.length` |
| **Action Tasks Queue** | `data.assignedApplicationsQueue` | `data.assignedApplicationsQueue` |

---

## 3. Documents Module Integration

* **MIME Verification**: Front uploader checks extensions.
* **Payload Format**: Real multipart files are uploaded via `FormData` containing the file attachment mapped to key `document` and parameter string `documentType` target.
* **Endpoint**: `POST /api/v1/applications/:appId/documents`
* **Audit**: Ensure the upload headers explicitly set `'Content-Type': 'multipart/form-data'` and correctly parse incoming payload fields.

---

## 4. Reports & Revenue Ledger

* **CSV UTF-8 BOM Stream**: Reports endpoint returns a raw stream download.
* **Endpoint**: `GET /api/v1/reports/revenue`
* **Audit**: Reports Page must request the data with `responseType: 'blob'` to parse binary files safely on client side without corruption.
