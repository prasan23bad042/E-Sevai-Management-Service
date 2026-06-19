# E-Sevai SaaS - Performance Testing Plan

This document outlines the performance benchmarks, targets, datasets size profiles, and monitoring variables to test before deployment.

---

## 1. Load Test Targets

| Metric | Target / SLA | Condition |
| :--- | :--- | :--- |
| **Response Latency** | < 200 ms (Average) | For all standard CRUD endpoints |
| **Reports Generation** | < 2000 ms (Average) | For full exports containing 10,000+ rows |
| **Concurrent Users** | 100 concurrent users | Continuous transactions load |
| **Peak Load Capacity** | 1000 concurrent users | Spike testing buffer |
| **Throughput (TPS)** | > 50 transactions/sec | System handling limit |

---

## 2. Test Datasets Scale Profiles
Database contains matching mock datasets of size:
- **Centers**: 100 centers.
- **Center Staff**: 500 active staff profiles.
- **Services Catalog**: 50 active service types.
- **Applications**: 100,000 application records (enforcing date ranges).
- **Documents Checklist**: 1,000,000 document records.
- **Payments**: 50,000 payment logs.

---

## 3. Metrics to Monitor

### Memory & CPU Utilization
- Monitor Docker container memory footprint. Max target limit <= **512 MB**.
- Monitor CPU limits. Ensure no single core is saturated at 100% for over 5 seconds.

### Database Query Optimizations
- Audit database locks.
- Ensure composite indexes on `applications(center_id, status)` and `payments(center_id, payment_status)` eliminate sequential scans.
- Run `EXPLAIN ANALYZE` on SQL queries to verify search uses index scans.
