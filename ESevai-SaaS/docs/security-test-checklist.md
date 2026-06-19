# E-Sevai SaaS - Security Testing Checklist

This checklist defines standard security validation test cases to execute during QA.

---

## 1. Authentication & Session Validation
- [ ] **JWT Signature Verification**: Verify that tampering with the JWT token header or payload (e.g. changing signature algorithm) rejects requests.
- [ ] **Token Expiration**: Verify that expired JWT tokens return `401 Unauthorized`.
- [ ] **Empty Bearer Headers**: Verify that requests with missing `Authorization` headers are blocked.

## 2. Authorization & Privilege Escalation
- [ ] **Staff Privilege Escalation**: Verify that staff members attempting to call `/api/v1/admin/` endpoints get `403 Forbidden`.
- [ ] **Cross-Center IDOR (Applications)**: Verify that E-Sevai Center Owner A cannot view details of Application B belonging to Center B by requesting `GET /api/v1/applications/APP_B_UUID`.
- [ ] **Cross-Center IDOR (Documents)**: Verify that Staff A cannot fetch signed download URLs for documents of Center B.
- [ ] **Cross-Center IDOR (Payments)**: Verify that Manager A cannot complete payments for Center B.

## 3. Input Sanitization & File Abuse
- [ ] **File Extension Bypass**: Attempt uploading `script.php` or `shell.exe` renamed as `photo.png` or `doc.pdf`. Verify the MIME validation filters block it.
- [ ] **Large File Rejection**: Attempt uploading a document of size 15MB. Verify that the upload service throws a size restriction error.
- [ ] **SQL Injection Filters**: Verify that SQL wildcard arguments in filter fields (e.g. `?search=' OR 1=1--`) do not cause execution issues in Supabase queries.
- [ ] **Cross-Site Scripting (XSS)**: Verify that HTML tags in remarks fields are treated as plain text and not compiled in PDF/HTML report generators.
- [ ] **Rate Limiting Checks**: Run a script calling `/api/v1/auth/login` 110 times in 1 minute. Verify the IP gets blocked with `429 Rate Limit Exceeded`.
- [ ] **Secure Signed URLs Expiration**: Verify that a signed URL requested for a document download is invalid after 5 minutes.
- [ ] **Security Headers Check**: Inspect HTTP response headers using curl. Verify `X-Frame-Options` is set to `DENY` and `X-Content-Type-Options` is `nosniff`.
