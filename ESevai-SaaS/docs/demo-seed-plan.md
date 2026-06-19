# E-Sevai SaaS - Demo Dataset Seeding Plan

This plan maps out the realistic mock datasets pre-seeded in the database to provide frontend developers with interactive data grids, dashboard charts, and search indexes from day one.

---

## 1. Tenant & Users Dataset

### Active Tenant: Salem E-Sevai Center (ID: `tenant_salem_01`)
* **Address**: 42, Cherry Road, Salem, Tamil Nadu - 636001.
* **Seeded Users**:
  - `owner@salemsevacenter.in` (Role: `center_owner`, Name: "Arun Kumar")
  - `manager@salemsevacenter.in` (Role: `manager`, Name: "Meera Nair")
  - `staff1@salemsevacenter.in` (Role: `staff`, Name: "Priya Rajan")
  - `staff2@salemsevacenter.in` (Role: `staff`, Name: "Vijay Chandran")

### Pending Tenant: Madurai E-Sevai Hub (ID: `tenant_madurai_pending`)
* **Onboarding Status**: `pending` (Awaiting platform admin approval)
* **Registered Owner**: `owner@maduraisevahub.in` (Name: "Selvam Pandian")

---

## 2. Services Catalog (Sample Rows)

| Service ID | Service Name | Gov Fee | Service Charge | SLA (Days) | Required Documents |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `srv_001` | Income Certificate | ₹100 | ₹50 | 15 | Aadhaar, Salary Certificate, Smart Card |
| `srv_002` | Community Certificate | ₹80 | ₹50 | 10 | Aadhaar, School Transfer Certificate, Parent Caste Certificate |
| `srv_003` | Nativity Certificate | ₹120 | ₹50 | 12 | Aadhaar, Ration Card, Address Proof |

---

## 3. Mock Citizens & Applications

A pool of 100 applications is generated containing realistic details matching active services:

### Application 1: Under Review (Income Certificate)
* **App Number**: `APP-2026-000001`
* **Citizen**: "Ramesh Krishnan" (Phone: `+919876543210`, Email: `ramesh@example.com`)
* **State**: `assigned` (Assigned to `Priya Rajan` for document validation)
* **Timeline**:
  - `2026-06-15`: Created by staff.
  - `2026-06-15`: Documents checklist generated (Aadhaar, Salary Cert uploaded).
  - `2026-06-16`: Assigned to Priya Rajan.

### Application 2: Awaiting Payment (Community Certificate)
* **App Number**: `APP-2026-000002`
* **Citizen**: "Anjali Devi" (Phone: `+919444123456`, Email: `anjali@example.com`)
* **State**: `pending_payment` (Documents verified by manager `Meera Nair`)
* **Timeline**:
  - `2026-06-14`: Created by staff.
  - `2026-06-14`: All 3 documents uploaded.
  - `2026-06-15`: Verified by Meera.

### Application 3: Completed (Nativity Certificate)
* **App Number**: `APP-2026-000003`
* **Citizen**: "Manoj Kumar" (Phone: `+919003198765`, Email: `manoj@example.com`)
* **State**: `completed`
* **Timeline**:
  - `2026-06-10`: Created.
  - `2026-06-11`: Docs uploaded & verified.
  - `2026-06-11`: UPI Payment completed (₹170).
  - `2026-06-12`: Application approved and certificate issued.

---

## 4. Payments Registry (Mock Transactions)

To test financial dashboards and reporting widgets, the database is pre-seeded with 100 payment entries:

* **Cash Transactions (65%)**:
  - Collected offline by staff operators.
  - Average transaction: government fees plus service charges.
  - Cash drawers logs reconcile balance refunds (e.g. Received: ₹200, Return: ₹50).
* **UPI Transactions (35%)**:
  - Mock payments tracking unique Transaction IDs (e.g., `UPI_TXN_882910`).
  - Correlated to status: `completed` in billing log datasets.
