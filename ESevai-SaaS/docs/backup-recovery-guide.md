# E-Sevai SaaS - Backup & Recovery Guide

This document defines the automated backup strategy, scheduling, storage locations, and verification/recovery protocols for E-Sevai SaaS Platform databases and files.

---

## 1. Database Backup Strategy

### Schedule (Automated pg_dump)
- **Daily Incremental Backups**: Scheduled at 02:00 AM UTC.
- **Weekly Full Backups**: Scheduled every Sunday at 02:00 AM UTC.
- **Retention Period**: Daily backups are retained for 30 days. Weekly backups are retained for 1 year.

### Execution Command (Supabase / Postgres CLI)
Automated cron jobs execute the following dump commands:
```bash
pg_dump -h db.vvxpbjxyctsxggeomder.supabase.co -U postgres -d postgres -F c -b -v -f /backups/db/esevai_db_$(date +%F).dump
```
Backup dumps are encrypted using GPG and synced immediately to a secure AWS S3 Glacier archive bucket.

---

## 2. Storage & Receipt Document Backups

### Bucket Replication
- **Application Documents (`application-documents`)**: Storage files are backed up daily using a cross-region replication strategy.
- **Receipts (`receipts-documents`)**: Storage files contain critical billing documents. A weekly sync is run to download new receipts locally to an archival storage server.
- **Sync Command**:
  ```bash
  aws s3 sync s3://receipts-documents /backups/receipts/ --delete
  ```

---

## 3. Disaster Recovery (DR) Procedures

### Database Restore Commands
To restore the database to a fresh container in case of severe corruption:

1. Stop application containers:
   ```bash
   docker-compose stop backend
   ```
2. Run database restoration:
   ```bash
   pg_restore -h db.vvxpbjxyctsxggeomder.supabase.co -U postgres -d postgres -v --clean --no-acl --no-owner /backups/db/esevai_db_target_date.dump
   ```
3. Restart application containers:
   ```bash
   docker-compose start backend
   ```

### Recovery Testing Schedule
- Restoration drills are performed **quarterly** in a staging/sandbox environment.
- Goal: Maintain Recovery Point Objective (RPO) of < 24 hours and Recovery Time Objective (RTO) of < 4 hours.
