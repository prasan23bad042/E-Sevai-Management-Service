# E-Sevai SaaS - Role-Based Test Matrix

This matrix maps access controls for E-Sevai endpoints. Verify that each endpoint returns the expected HTTP status code when requested by different user roles.

---

## Access Control Matrix

| Endpoint | Platform Admin | Center Owner | Center Manager | Center Staff |
| :--- | :---: | :---: | :---: | :---: |
| **POST /api/v1/centers** *(Create center)* | **201** | **201** | **201** | **201** |
| **PUT /api/v1/admin/centers/:id/approve** | **200** | **403** | **403** | **403** |
| **POST /api/v1/invitations** *(Create invite)* | **201** | **201** | **201** | **403** |
| **POST /api/v1/applications** *(Submit app)* | **201** | **201** | **201** | **201** |
| **POST /api/v1/documents/upload** | **201** | **201** | **201** | **201** |
| **PUT /api/v1/documents/:id/verify** | **200** | **200** | **200** | **403** |
| **PUT /api/v1/documents/:id/reject** | **200** | **200** | **200** | **403** |
| **PUT /api/v1/payments/:id/pay** | **200** | **200** | **200** | **200** |
| **PUT /api/v1/payments/:id/cancel** | **200** | **200** | **200** | **403** |
| **PUT /api/v1/payments/:id/refund** | **200** | **200** | **403** | **403** |
| **GET /api/v1/dashboard/admin** | **200** | **403** | **403** | **403** |
| **GET /api/v1/dashboard/owner** | **200** | **200** | **403** | **403** |
| **GET /api/v1/dashboard/manager** | **200** | **403** | **200** | **403** |
| **GET /api/v1/dashboard/staff** | **200** | **403** | **403** | **200** |
| **GET /api/v1/dashboard/audit** | **200** | **403** | **403** | **403** |
| **GET /api/v1/reports/revenue** | **200** | **200** | **200** | **403** |
| **GET /api/v1/reports/sla** | **200** | **200** | **200** | **200** |

---

## Legend:
- **201 / 200**: Request is authorized and executes successfully.
- **403**: Forbidden. Role authorization blocks request execution.
- **401**: Unauthenticated. Returns if JWT token is missing or invalid.
