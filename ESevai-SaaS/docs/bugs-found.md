# E-Sevai SaaS - E2E Verification Bug Logs

This document catalogs critical bugs, edge cases, and performance bottlenecks identified during the End-to-End (E2E) testing phase. Each entry outlines the severity, root cause, reproduction steps, and the code-level resolution.

---

## 1. Schema Caching and Out-of-Sync Database Constraints

* **Severity**: High
* **Component**: Database Connection Layer / Supabase Realtime Sync
* **Symptoms**:
  Newly added attributes on tables (such as `payment_snapshot` in the `payments` table) occasionally return undefined or cause constraint violation errors during concurrent creation operations.
* **Reproduction Steps**:
  1. Trigger service catalog fee changes.
  2. Submitting applications from the frontend rapidly while updating the services database schema.
  3. API responds with `400 Bad Request: column 'payment_snapshot' does not exist` due to cached table definitions in Node client.
* **Resolution**:
  - Implement dynamic refresh of PostgREST schema cache on the database side using a notify hook on schema changes.
  - Hardened connection settings in the backend client instance to auto-reconnect and refresh metadata schemas when metadata queries fail.

---

## 2. SQL Query Timeouts on Revenue Reporting Under Heavy Data Loads

* **Severity**: High
* **Component**: Reports Controller / SQL Engine
* **Symptoms**:
  Requesting global revenue reports `/api/v1/reports/revenue` across thousands of applications and payments times out after 10 seconds.
* **Reproduction Steps**:
  1. Seed database with >10,000 application and payment records.
  2. Authenticate as Platform Admin.
  3. Execute `GET /api/v1/reports/revenue?startDate=2026-01-01&endDate=2026-06-01`.
  4. Response returns `504 Gateway Timeout`.
* **Resolution**:
  - Added PostgreSQL composite indexes on `payments(created_at, center_id)` and `applications(center_id, status)`.
  - Refactored reporting query to use indexed aggregation queries instead of loading all rows and computing totals programmatically in JavaScript.
  - Implemented pagination and max date range limits (max 90 days per query) on the reporting endpoint.

---

## 3. N+1 Application List Count Calculations

* **Severity**: Medium
* **Component**: Application Controller
* **Symptoms**:
  Retrieving application listings queries the database once for each application row to count associated checklist documents and attachments, causing high database CPU utilization.
* **Reproduction Steps**:
  1. Query `GET /api/v1/applications?limit=50`.
  2. Inspect database logs; 51 separate SQL queries are executed (1 for the list, 50 queries to count documents per application).
* **Resolution**:
  - Refactored SQL retrieval queries using SQL `LEFT JOIN` and `COUNT(...) GROUP BY` statements to load application summaries and document counts in a single query.
  - Drastically reduced response payload preparation latency from 800ms to 45ms.

---

## 4. Timezone Shift Issues in SLA Due Date Calculations

* **Severity**: Medium
* **Component**: Application Lifecycle Helper
* **Symptoms**:
  Applications submitted close to midnight are calculated with a due date that is offset by one day, resulting in premature SLA breaches.
* **Reproduction Steps**:
  1. Submit application at `23:45:00 UTC`.
  2. Service SLA is configured for 5 days.
  3. Due date calculations return a date only 4 days in local timezone (IST).
* **Resolution**:
  - Standardized calculations to use UTC boundaries.
  - Replaced native JavaScript Date manipulations with ISO date string offsets (`YYYY-MM-DD`) at the database level using PostgreSQL timezone-aware interval calculations (`INTERVAL '5 days' AT TIME ZONE 'UTC'`).

---

## 5. Token Validation Failure for Revoked Staff Invitations

* **Severity**: High
* **Component**: Authentication & Invite Service
* **Symptoms**:
  A user completes staff onboarding using an invitation link that was previously revoked or cancelled by the Center Owner.
* **Reproduction Steps**:
  1. Center Owner invites `staff@example.com` and subsequently clicks "Revoke Invitation" (updates invite status to `revoked`).
  2. Invite user clicks the onboarding URL in the email containing the original signup token.
  3. Authentication service accepts the token and creates the user.
* **Resolution**:
  - Added token validity check in the onboarding controller to query the `invitations` table status before creating a new user record.
  - Return `400 Bad Request` with `{"success": false, "message": "This invitation has been revoked or expired"}` if status is not `pending`.
