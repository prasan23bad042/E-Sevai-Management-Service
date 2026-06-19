# E-Sevai SaaS - API Contract Audit & Response Standardizations

This audit documents the discrepancies between the frontend expectations and backend response formats for each module, establishing the standard endpoint models for integration.

---

## 1. Response Format Standardization Strategy
To reduce frontend complexity and avoid data massaging inside React hooks, all backend API responses will be unified to return the standard wrapper schema:
```json
{
  "success": true,
  "data": <PayloadObjectOrArray>
}
```
Any controller returning a top-level custom property (e.g. `center`, `staff`, `applications`, `payments`, `notifications`) will be updated to encapsulate it inside the `"data"` field.

---

## 2. Endpoint Payloads Audit Matrix

### 2.1 Authentication Module
* **POST /api/v1/auth/login**
  - **Frontend Expectation**: `{ success: true, data: { token: string, user: { id, email, role, name, tenant_id } } }`
  - **Backend Original**: `{ success: true, user: { id, email, role }, access_token }`
  - **Resolution**: Fetch the user's name (`full_name`) and center ID (`center_id`) from the database `users` and `center_staff` tables. Wrap them inside `"data"`:
    ```json
    {
      "success": true,
      "data": {
        "token": "access_token_jwt",
        "user": {
          "id": "user-uuid",
          "email": "user@example.com",
          "role": "platform_admin|center_owner|manager|staff",
          "name": "Full Name",
          "tenant_id": "center-uuid-or-null"
        }
      }
    }
    ```

* **GET /api/v1/auth/me**
  - **Frontend Expectation**: `{ success: true, data: { user: { id, email, role, name, tenant_id } } }`
  - **Backend Original**: `{ success: true, user: req.user }` (only contains JWT claims, lacks `full_name` and scoped center)
  - **Resolution**: Load the user's row from the database `users` table and return it wrapped in `"data"`.

---

### 2.2 Dashboard Module
* **GET /api/v1/dashboard/admin**
  - **Frontend Expectation**: `{ success: true, data: { totalCenters, pendingCenters, totalApplications, totalServices } }`
  - **Backend Original**: `{ success: true, data: { centers: { total, approved, pending }, applications: { total }, revenue: { today, month }, topServices, topCenters } }`
  - **Resolution**: Return both the expected counters and nested analytics arrays inside the standard `"data"` container:
    ```json
    {
      "success": true,
      "data": {
        "totalCenters": centers.total,
        "pendingCenters": centers.pending,
        "totalApplications": applications.total,
        "totalServices": topServices.length,
        "centers": centers,
        "applications": applications,
        "revenue": revenue,
        "topServices": topServices,
        "topCenters": topCenters
      }
    }
    ```

* **GET /api/v1/dashboard/owner**
  - **Frontend Expectation**: `{ success: true, data: { stats: { activeStaffCount, totalAppsCount, revenueCollected, pendingPaymentsCount } } }`
  - **Backend Original**: `{ success: true, data: { center_name, applications: { today, pending, completed }, revenue, active_staff, verification_queue_length } }`
  - **Resolution**: Inject the `stats` metrics object into the `data` payload:
    ```json
    {
      "success": true,
      "data": {
        "stats": {
          "activeStaffCount": active_staff,
          "totalAppsCount": applications.pending + applications.completed,
          "revenueCollected": revenue.month.total_revenue,
          "pendingPaymentsCount": verification_queue_length
        },
        "center_name": center_name,
        "applications": applications,
        "revenue": revenue,
        "active_staff": active_staff,
        "verification_queue_length": verification_queue_length
      }
    }
    ```

* **GET /api/v1/dashboard/manager**
  - **Frontend Expectation**: `{ success: true, data: { stats: { staffCount, unassignedApps, pendingReviewsCount, slaBreachCount } } }`
  - **Backend Original**: `{ success: true, data: { center_id, applications: { assigned_total, completed }, pending_document_reviews, rejected_documents_count } }`
  - **Resolution**: Inject the `stats` metrics object into the `data` payload:
    ```json
    {
      "success": true,
      "data": {
        "stats": {
          "staffCount": applications.assigned_total,
          "unassignedApps": applications.assigned_total - applications.completed,
          "pendingReviewsCount": pending_document_reviews,
          "slaBreachCount": rejected_documents_count
        },
        "center_id": center_id,
        "applications": applications,
        "pending_document_reviews": pending_document_reviews,
        "rejected_documents_count": rejected_documents_count
      }
    }
    ```

* **GET /api/v1/dashboard/staff**
  - **Frontend Expectation**: `{ success: true, data: { stats: { assignedCount, draftsCount, awaitingUploads, activeAlerts } } }`
  - **Backend Original**: `{ success: true, data: { assigned_applications, completed_applications, pending_applications, today_activity_timeline } }`
  - **Resolution**: Inject the `stats` metrics object into the `data` payload:
    ```json
    {
      "success": true,
      "data": {
        "stats": {
          "assignedCount": assigned_applications,
          "draftsCount": pending_applications,
          "awaitingUploads": pending_applications,
          "activeAlerts": today_activity_timeline.length
        },
        "assigned_applications": assigned_applications,
        "completed_applications": completed_applications,
        "pending_applications": pending_applications,
        "today_activity_timeline": today_activity_timeline
      }
    }
    ```

---

### 2.3 Centers Module
* **GET /api/v1/admin/centers**
  - **Frontend Expectation**: `{ success: true, data: [...] }`
  - **Backend Original**: `{ success: true, centers: [...] }`
  - **Resolution**: Map the center list directly to `"data"`.

* **PUT /api/v1/admin/centers/:id/approve**
  - **Frontend Expectation**: `{ success: true, data: { ... } }`
  - **Backend Original**: `{ success: true, center: { ... } }`
  - **Resolution**: Map the center object to `"data"`.

* **POST /api/v1/centers**
  - **Frontend Expectation**: `{ success: true, data: { ... } }`
  - **Backend Original**: `{ success: true, center: { ... } }`
  - **Resolution**: Map the center object to `"data"`.

* **GET /api/v1/centers/my-center**
  - **Frontend Expectation**: `{ success: true, data: { ... } }`
  - **Backend Original**: `{ success: true, center: [...] }` (Array)
  - **Resolution**: Return the first element of the array mapped to `"data"` or `null` if empty:
    ```json
    {
      "success": true,
      "data": center[0] || null
    }
    ```

---

### 2.4 Staff & Invitations Module
* **GET /api/v1/staff/:centerId**
  - **Frontend Expectation**: `{ success: true, data: [...] }`
  - **Backend Original**: `{ success: true, staff: [...] }`
  - **Resolution**: Map the staff array to `"data"`.

* **GET /api/v1/invitations/:centerId**
  - **Frontend Expectation**: `{ success: true, data: [...] }`
  - **Backend Original**: `{ success: true, invitations: [...] }`
  - **Resolution**: Map the invitations array to `"data"`.

* **POST /api/v1/invitations/:centerId**
  - **Frontend Expectation**: `{ success: true, data: { ... } }`
  - **Backend Original**: `{ success: true, invitation: { ... } }`
  - **Resolution**: Map the invitation object to `"data"`.

* **PUT /api/v1/invitations/:invitationId/cancel**
  - **Frontend Expectation**: `{ success: true, data: { ... } }`
  - **Backend Original**: `{ success: true, invitation: { ... } }`
  - **Resolution**: Map the cancelled invitation object to `"data"`.

---

### 2.5 Services Module
* **GET /api/v1/services**
  - **Frontend Expectation**: `{ success: true, data: [...] }`
  - **Backend Original**: `{ success: true, services: [...] }`
  - **Resolution**: Map the services array to `"data"`.

* **PUT /api/v1/services/:id**
  - **Frontend Expectation**: `{ success: true, data: { ... } }`
  - **Backend Original**: `{ success: true, service: { ... } }`
  - **Resolution**: Map the updated service object to `"data"`.

---

### 2.6 Applications Module
* **GET /api/v1/applications**
  - **Frontend Expectation**: `{ success: true, data: { applications: [...], total, page, limit, pages } }`
  - **Backend Original**: `{ success: true, applications: [...], total, page, limit, pages }`
  - **Resolution**: Wrap the pagination attributes inside the `"data"` object:
    ```json
    {
      "success": true,
      "data": {
        "applications": applications,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages
      }
    }
    ```

* **GET /api/v1/applications/:id**
  - **Frontend Expectation**: `{ success: true, data: { application, service, assigned_staff, uploaded_documents, timeline, checklist } }`
  - **Backend Original**: `{ success: true, application, service, assigned_staff, uploaded_documents, timeline }`
  - **Resolution**: Map everything inside the `"data"` container, adding the checklist mapping matching application's `document_checklist`:
    ```json
    {
      "success": true,
      "data": {
        "application": application,
        "service": service,
        "assigned_staff": assigned_staff,
        "uploaded_documents": uploaded_documents,
        "timeline": timeline,
        "checklist": application.document_checklist || []
      }
    }
    ```

* **PUT /api/v1/applications/:id/assign**
  - **Frontend Expectation**: `{ success: true, data: { ... } }`
  - **Backend Original**: `{ success: true, application: { ... } }`
  - **Resolution**: Map the updated application object to `"data"`.

* **PUT /api/v1/applications/:id/status**
  - **Frontend Expectation**: `{ success: true, data: { ... } }`
  - **Backend Original**: `{ success: true, application: { ... } }`
  - **Resolution**: Map the updated application object to `"data"`.

---

### 2.7 Documents Module
* **GET /api/v1/documents/application/:applicationId**
  - **Frontend Expectation**: `{ success: true, data: [...] }`
  - **Backend Original**: `{ success: true, documents: [...] }`
  - **Resolution**: Map the documents list to `"data"`.

* **POST /api/v1/documents/upload**
  - **Frontend Expectation**: `{ success: true, data: { ... } }`
  - **Backend Original**: `{ success: true, document: { ... } }`
  - **Resolution**: Map the created document object to `"data"`.

* **PUT /api/v1/documents/:id/verify**
  - **Frontend Expectation**: `{ success: true, data: { ... } }`
  - **Backend Original**: `{ success: true, document: { ... } }`
  - **Resolution**: Map the verified document object to `"data"`.

* **PUT /api/v1/documents/:id/reject**
  - **Frontend Expectation**: `{ success: true, data: { ... } }`
  - **Backend Original**: `{ success: true, document: { ... } }`
  - **Resolution**: Map the rejected document object to `"data"`.

---

### 2.8 Payments Module
* **GET /api/v1/payments**
  - **Frontend Expectation**: `{ success: true, data: [...] }`
  - **Backend Original**: `{ success: true, payments: [...] }`
  - **Resolution**: Map the payments list array directly to `"data"`.

* **POST /api/v1/payments**
  - **Frontend Expectation**: `{ success: true, data: { ... } }`
  - **Backend Original**: `{ success: true, payment: { ... } }`
  - **Resolution**: Map the created payment object to `"data"`.

* **PUT /api/v1/payments/:id/pay**
  - **Frontend Expectation**: `{ success: true, data: { ... } }`
  - **Backend Original**: `{ success: true, payment: { ... } }`
  - **Resolution**: Map the paid payment object to `"data"`.

---

### 2.9 Notifications Module
* **GET /api/v1/notifications**
  - **Frontend Expectation**: `{ success: true, data: [...] }`
  - **Backend Original**: `{ success: true, notifications: [...] }`
  - **Resolution**: Map the notifications array to `"data"`.

* **PUT /api/v1/notifications/:id/read**
  - **Frontend Expectation**: `{ success: true, data: { ... } }`
  - **Backend Original**: `{ success: true, notification: { ... } }`
  - **Resolution**: Map the updated notification object to `"data"`.

* **DELETE /api/v1/notifications/:id**
  - **Frontend Expectation**: `{ success: true, data: { ... } }`
  - **Backend Original**: `{ success: true, notification: { ... } }`
  - **Resolution**: Map the deleted notification object to `"data"`.
