# E-Sevai SaaS - Mock API Response Standards

This reference catalog defines the exact payload JSON structures returned by the backend under varying execution results. Developers should use these mocks to configure local mock servers (such as MSW or mock endpoints) to sustain frontend design iteration independent of backend systems.

---

## 1. Global Response Envelope

All API endpoints follow a strict, standardized JSON envelope. The field `success` indicates binary status, `request_id` exposes the correlation ID for log tracing, and the body data resides either in `data` (success) or `error` (failure).

---

## 2. Standard Response Scenarios

### Scenario A: Success Response (`200 OK` or `201 Created`)
Used for successful resource retrievals, updates, or creations.

```json
{
  "success": true,
  "request_id": "req_a1b2c3d4e5f6g7h8",
  "data": {
    "application_number": "APP-2026-000492",
    "status": "draft",
    "citizen_details": {
      "name": "Karthik Raja",
      "phone": "+919876543210",
      "email": "karthik.raja@example.com"
    },
    "service_details": {
      "service_id": "service_income_001",
      "service_name": "Income Certificate",
      "government_fee": 100,
      "service_charge": 50
    },
    "sla_due_date": "2026-07-03T18:30:00.000Z",
    "created_at": "2026-06-18T05:50:00.000Z"
  }
}
```

### Scenario B: Validation Error (`400 Bad Request`)
Returned when payload parameters fail inputs validation (e.g. missing fields, bad email format, invalid file format).

```json
{
  "success": false,
  "request_id": "req_val_7894561230ab",
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request payload failed validation checks.",
    "details": [
      {
        "field": "phone",
        "issue": "Phone number must be exactly 10 digits prefixed with valid Indian country code (+91)."
      },
      {
        "field": "documentType",
        "issue": "Aadhaar Card document type is required for this application checklist."
      }
    ]
  }
}
```

### Scenario C: Unauthorized Error (`401 Unauthorized`)
Returned when the Authorization header is missing, malformed, or the JWT token signature is expired.

```json
{
  "success": false,
  "request_id": "req_auth_unauthorized",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication is required to access this resource. Please log in again."
  }
}
```

### Scenario D: Forbidden Error (`403 Forbidden`)
Returned when the authenticated user lacks the necessary RBAC permissions to perform the requested operation (e.g. a staff member attempting to download global center billing logs).

```json
{
  "success": false,
  "request_id": "req_auth_forbidden",
  "error": {
    "code": "FORBIDDEN",
    "message": "Access Denied: You do not possess the required user roles (platform_admin or center_owner) to access this reporting resource."
  }
}
```

### Scenario E: File Upload Refusal (`400 Bad Request`)
Specifically thrown by the document upload checks if file verification rules are breached (e.g. invalid MIME type or checklist mismatch).

```json
{
  "success": false,
  "request_id": "req_doc_upload_fail",
  "error": {
    "code": "DOCUMENT_NOT_REQUIRED",
    "message": "The document type 'Passport' is not part of the generated checklist for this Income Certificate application."
  }
}
```

### Scenario F: Server Error (`500 Internal Server Error`)
Returned when the backend encounters runtime exceptions, SQL connection dropouts, or API gateway errors. Sensitive system trace details are masked in production mode.

```json
{
  "success": false,
  "request_id": "req_err_500_server_fail",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred on our systems. Please provide the request_id to support if the issue persists."
  }
}
```
