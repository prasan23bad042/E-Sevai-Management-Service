# E-Sevai SaaS - Production Deployment Guide

This document guides sysadmins and DevOps engineers through deploying the E-Sevai SaaS backend to a production environment.

---

## 1. Prerequisites
- Docker Engine >= 20.10
- Docker Compose >= 2.0
- Nginx (installed on host as reverse proxy)
- Registered domain name (e.g. `api.esevai-platform.com`)
- Supabase Project (Postgres instance & Storage Buckets)

---

## 2. Setting Up Environment Configuration
Clone the project and navigate to the backend directory. Create the `.env` file from the example template:
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` with your production values:
```env
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 3. Container Boot Sequence
Start the backend container in detached daemon mode:
```bash
docker-compose up -d --build
```
Verify the container is running:
```bash
docker ps
```
The application will start on port `5000` inside the container and bind to host port `5000`.

---

## 4. Nginx Reverse Proxy & SSL Configuration
Configure Nginx to route traffic to the container and enforce SSL/TLS encryption.

Create Nginx site configuration `/etc/nginx/sites-available/esevai`:
```nginx
server {
    listen 80;
    server_name api.esevai-platform.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.esevai-platform.com;

    ssl_certificate /etc/letsencrypt/live/api.esevai-platform.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.esevai-platform.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Request-ID $request_id; # Pass correlation IDs from Nginx
    }
}
```

Enable the configuration and reload Nginx:
```bash
ln -s /etc/nginx/sites-available/esevai /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 5. Staging vs Production Environmental Differences

| Dimension | Local Development | Staging Environment | Production Environment |
| :--- | :--- | :--- | :--- |
| **Node Env** | `development` | `production` | `production` |
| **Database** | Development Supabase Branch | Dedicated Staging Database | Main Production Supabase Cluster |
| **Rate Limiter** | Disabled or high limits (1000/min) | 500 requests per 15 min window | 100 requests per 15 min (auth) |
| **Security Headers** | Basic | Standard headers active | HSTS enabled, strict frame restrictions |
| **SSL/TLS** | Disabled (HTTP Localhost) | Self-signed or Let's Encrypt | Enforced Let's Encrypt Wildcard |
| **Logs Shipping** | Console stream (Plain text) | JSON file streams | Winston JSON piped to cloudwatch/S3 |
| **Backups** | Manual | Weekly pg_dump | Daily encrypted pg_dump + Glacier replication |

---

## 6. Deployment Verification
Test the healthcheck endpoint to confirm database and storage connections are operational:
```bash
curl https://api.esevai-platform.com/health
```
**Expected Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "storage": "connected",
  "version": "1.0.0"
}
```
