# E-Sevai SaaS - Go-Live Checklist

Final checklist to clear release before pilot launch.

---

## Final Validation Actions

### 1. Database & Migrations
- [ ] Database optimizations SQL executed: `\i 01_database_optimizations.sql`.
- [ ] Row Level Security (RLS) policies reviewed on all Supabase tables.
- [ ] Unused test center accounts pruned.

### 2. File Uploads & Storage Buckets
- [ ] Bucket `application-documents` exists and permissions are private.
- [ ] Bucket `receipts-documents` exists and permissions are private.
- [ ] Signed URL generation limits tested for expiry behavior.

### 3. Business Flows Integrations
- [ ] Center onboarding and approval works.
- [ ] Staff invitations onboarding accepts and registers users.
- [ ] Applications checklist automatically advances.
- [ ] Payments completeness checks block multiple active payments.
- [ ] Receipt generation versions increments (`v1`, `v2`, `v3`) verified.
- [ ] Dashboard analytics compile correctly with in-memory caching.
- [ ] Multi-format reports export in CSV and Excel tables.

### 4. Hardening & Tracing
- [ ] Startup env validates successfully.
- [ ] Health monitoring returns "healthy" response status.
- [ ] Correlation IDs are set on Nginx requests.
- [ ] Structured logging captures errors with request IDs.
