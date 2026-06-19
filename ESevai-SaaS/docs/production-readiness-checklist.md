# E-Sevai SaaS - Production Readiness Checklist

This checklist tracks system requirements before E-Sevai SaaS backend deployment is cleared for Go-Live.

---

## 1. Security & Compliance
- [ ] Centralized JWT token validation is active on all non-public APIs.
- [ ] Custom security headers middleware is mounted globally.
- [ ] IP Rate Limiter is configured and activated on auth and documentation paths.
- [ ] User role checks (`platform_admin`, `center_owner`, `manager`, `staff`) restrict all endpoint handlers.
- [ ] Signed URL access to private Supabase storage buckets is limited to 5 minutes expiration.
- [ ] File uploads restrict extensions to PDF, JPG, JPEG, and PNG, and enforce size checks (<=10MB).

## 2. Infrastructure & Scaling
- [ ] Production backend is containerized using multi-stage Docker builds.
- [ ] Port configurations (5000) are mapped behind an Nginx reverse proxy.
- [ ] Nginx is configured to terminate SSL/TLS certificates and reject HTTP traffic.
- [ ] DB connection pooling is active.
- [ ] Index optimization SQL migration scripts are executed in Supabase SQL editor.

## 3. Operations & Observability
- [ ] Healthcheck `/health` routes return connectivity status of database and storage.
- [ ] Logs emit structured JSON strings containing request correlation IDs.
- [ ] Environment validation pre-check validate env parameters on startup.
- [ ] Automated daily database pg_dump backups are active and verified.
- [ ] Storage document sync replicates directories to cold archive buckets.
