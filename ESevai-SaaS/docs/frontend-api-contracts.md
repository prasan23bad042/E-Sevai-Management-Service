# E-Sevai SaaS - Frontend API Contracts

This file lists the REST API contracts for the versioned `/api/v1` backend endpoints.

---

## 1. Authentication

### Post Login
- **URL**: `POST /api/v1/auth/login`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "role": "center_owner"
    },
    "access_token": "eyJhbGci..."
  }
  ```

---

## 2. Center Onboarding

### Create Center
- **URL**: `POST /api/v1/centers`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "name": "E-Sevai Adyar Center",
    "address": "12 Main Street, Adyar",
    "district": "Chennai",
    "state": "Tamil Nadu",
    "pincode": "600020"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "center": {
      "id": "center-uuid",
      "center_code": "CTR0001",
      "name": "E-Sevai Adyar Center",
      "status": "pending"
    }
  }
  ```

---

## 3. Application Submission

### Submit Application
- **URL**: `POST /api/v1/applications`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "service_id": "service-uuid",
    "center_id": "center-uuid",
    "customer_name": "John Doe",
    "customer_phone": "9876543210",
    "customer_email": "john@example.com",
    "customer_address": "456 Cross St, Chennai",
    "remarks": "Priority certificate requested"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "application": {
      "id": "app-uuid",
      "application_number": "APP-2026-000001",
      "status": "submitted",
      "due_date": "2026-07-03T10:00:00Z"
    }
  }
  ```

---

## 4. Document Management

### Upload Document
- **URL**: `POST /api/v1/documents/upload`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
- **Request Body**:
  - `application_id`: `"app-uuid"`
  - `document_name`: `"Aadhaar Card"`
  - `file`: `[File Binary]`
  - `expiry_date`: `"2030-12-31"` (Optional)
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "document": {
      "id": "doc-uuid",
      "document_name": "Aadhaar Card",
      "version": 1,
      "upload_status": "uploaded",
      "file_hash": "sha256-hash-value"
    }
  }
  ```

---

## 5. Billing & Payments

### Complete Payment
- **URL**: `PUT /api/v1/payments/:id/pay`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "payment_method": "cash",
    "cash_received": 150.00,
    "balance_returned": 0.00
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Payment registered successfully",
    "payment": {
      "id": "payment-uuid",
      "payment_status": "paid",
      "cash_received": 150,
      "balance_returned": 0
    }
  }
  ```

---

## 6. Dashboards & Analytics

### Admin Dashboard
- **URL**: `GET /api/v1/dashboard/admin`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "centers": { "total": 12, "approved": 10, "pending": 2 },
    "applications": { "total": 540, "completed": 450 },
    "revenue": {
      "today": { "government_revenue": 1200, "center_revenue": 600, "total_revenue": 1800 },
      "month": { "government_revenue": 35000, "center_revenue": 17500, "total_revenue": 52500 }
    }
  }
  ```
