# E-Sevai SaaS - Test User Accounts Catalog

To expedite frontend integration, manual testing, and QA validation, use the following pre-configured test accounts. These credentials match the mock-seeded data.

---

## 1. Credentials Inventory

> [!WARNING]
> These credentials are strictly for local testing, staging validation, and UAT. Do not use these accounts in production environments.

| Role | Username / Email | Password | Primary Assigned Tenant |
| :--- | :--- | :--- | :--- |
| **Platform Admin** | `admin@esevaisaas.gov.in` | `AdminSecure@2026` | *Global (All Tenants)* |
| **Center Owner** | `owner@salemsevacenter.in` | `OwnerSecure@2026` | `Salem E-Sevai Center (ID: tenant_salem_01)` |
| **Manager** | `manager@salemsevacenter.in` | `ManagerSecure@2026` | `Salem E-Sevai Center (ID: tenant_salem_01)` |
| **Staff** | `staff1@salemsevacenter.in` | `StaffSecure@2026` | `Salem E-Sevai Center (ID: tenant_salem_01)` |
| **Staff** | `staff2@salemsevacenter.in` | `StaffSecure@2026` | `Salem E-Sevai Center (ID: tenant_salem_01)` |

---

## 2. Expected Role Permissions and UI Scopes

### Platform Admin
* **Dashboard View**: Global analytics, tenant count metrics, revenue share, center pending lists.
* **Navigation Links**:
  - `Centers Management` (Activate, suspend, register centers).
  - `Global Services Catalog` (Define application fees, document checklists, SLAs).
  - `Global Reports` (Consolidated revenue, citizen growth chart widgets).
* **Permissions Scope**: Full access across all backend modules.

### Center Owner
* **Dashboard View**: Local center analytics, active staff count, pending application count, cash registry balance.
* **Navigation Links**:
  - `Staff Directory` (Invite new managers/staff, revoke active credentials).
  - `My Center Applications` (Manage center incoming applications).
  - `Payments Ledger` (Reconcile cash vs online payments for the center).
  - `Center Reports` (Download CSV/Excel reports for owner's center only).
* **Permissions Scope**: Full write and read access to own tenant workspace. Cannot see data for other centers.

### Manager
* **Dashboard View**: Daily operational application flow, assigned staff workloads, documents awaiting review.
* **Navigation Links**:
  - `Application Queue` (Assign applications, update status to verified or completed).
  - `Documents Verification` (Review attachments, approve/reject individual documents).
  - `Staff Directory` (Invite new staff members under the owner's center).
* **Permissions Scope**: Operations management. Cannot modify center billing settings or revoke owner credentials.

### Staff
* **Dashboard View**: Personal application queue, notifications bell, recent application draft status.
* **Navigation Links**:
  - `Create Application` (Select service, create citizen profile draft).
  - `My Tasks Queue` (Check documents checklist, trigger file uploads, record cash collections).
  - `Recent Activity` (Monitor notifications and logs).
* **Permissions Scope**: Read and write access to assigned applications only. Cannot delete records, view reports, or invite staff.

---

## 3. Login Workflow Testing Steps

1. Navigate to the login portal screen: `http://localhost:3000/login`.
2. Input target email (e.g., `owner@salemsevacenter.in`) and password (`OwnerSecure@2026`).
3. On submission, the API returns a response containing:
   - Auth JWT Token (placed in browser memory/cookie).
   - Profile Payload (`email`, `role`, `tenant_id`, `name`).
4. The client routing router redirects based on role:
   - If `platform_admin` -> Redirect to `/admin/dashboard`
   - If `center_owner` -> Redirect to `/owner/dashboard`
   - If `manager` -> Redirect to `/manager/dashboard`
   - If `staff` -> Redirect to `/staff/dashboard`
5. Attempting to browse to `/admin/dashboard` while logged in as `staff` must trigger the **Unauthorized Access Screen**.
