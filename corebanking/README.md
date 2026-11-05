# CoreBanking Backend - Deployment & Configuration Guide

This Spring Boot application is fully configured for environment-based deployments. It adheres to **12-Factor App principles**, allowing complete external configuration via:
1. **`.env` files** for local development.
2. **Native OS environment variables** for production and staging servers (Linux, Windows, Docker, Kubernetes).
3. **Safe fallback defaults** in `application.properties` for development convenience.

---

## Table of Contents
- [1. Prerequisites](#1-prerequisites)
- [2. Configuration Architecture](#2-configuration-architecture)
- [3. Environment Variables Reference](#3-environment-variables-reference)
- [4. Local Development Setup with .env](#4-local-development-setup-with-env)
- [5. Building the Executable JAR](#5-building-the-executable-jar)
- [6. Production Deployment on Linux](#6-production-deployment-on-linux)
  - [Using Shell Variables](#using-shell-variables)
  - [Using Systemd Service (Recommended)](#using-systemd-service-recommended)
- [7. Production Deployment on Windows](#7-production-deployment-on-windows)
  - [Using PowerShell](#using-powershell)
  - [Using Windows System Environment Variables](#using-windows-system-environment-variables)
- [8. Multi-Environment Configuration (Dev, Staging, Prod)](#8-multi-environment-configuration-dev-staging-prod)
- [9. Security Best Practices](#9-security-best-practices)

---

## 1. Prerequisites
- **Java Development Kit (JDK):** Version 21 LTS (`java -version` should report version 21.x)
- **Maven:** Bundled `./mvnw` (or Maven 3.9+)
- **Database:** MySQL 8.0+

---

## 2. Configuration Architecture

Spring Boot property resolution follows this priority (highest to lowest):
1. **Native OS Environment Variables** (`export DB_URL=...` or Windows `$Env:DB_URL=...`)
2. **JVM System Properties** (`java -Dserver.port=9090 -jar ...`)
3. **`.env` file** (loaded automatically by `DotenvEnvironmentPostProcessor` and `DotenvLoader` when present)
4. **`application.properties` defaults**

> **Note:** If `.env` is absent (such as in production), the application starts normally and relies solely on OS environment variables.

---

## 3. Environment Variables Reference

| Variable Name | Description | Default / Example | Required in Prod |
|---|---|---|:---:|
| `SERVER_PORT` | HTTP port for the embedded Tomcat web server | `8080` | Optional |
| `DB_URL` | JDBC connection URL for MySQL database | `jdbc:mysql://localhost:3306/corebanking` | **Yes** |
| `DB_USERNAME` | MySQL database username | `root` | **Yes** |
| `DB_PASSWORD` | MySQL database password | *(empty)* | **Yes** |
| `JPA_SHOW_SQL` | Log SQL statements | `false` | No |
| `JPA_DDL_AUTO` | Hibernate schema mode (`none`, `validate`, `update`) | `none` | No |
| `APP_SEED_ENABLED` | Master database seeder flag | `false` | No |
| `JWT_SECRET` | Base64-encoded HS256 secret for Customer Portal | `Y29yZWJhbmtpbmctand0LXNlY3JldC1rZXktMjAyNi1wcm9kdWN0aW9uLWdyYWRl` | **Yes** |
| `JWT_EXPIRATION` | Customer access token expiration in ms (e.g. 1 hour) | `3600000` | Optional |
| `JWT_ISSUER` | Customer JWT issuer name | `corebanking` | Optional |
| `APP_JWT_SECRET` | Plain string secret for Staff Auth (min 32 chars) | `my-core-banking-secret-key-must-be-at-least-32-characters` | **Yes** |
| `APP_JWT_EXPIRATION` | Staff access token expiration in ms (e.g. 15 min) | `900000` | Optional |
| `APP_JWT_ISSUER` | Staff JWT issuer name | `CoreBankingSystem` | Optional |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud account name | `minibank` | **Yes** |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `351784931889592` | **Yes** |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | `iLUfysCjI-PbCnMxnpLVng-Rpa0` | **Yes** |
| `FRONTEND_URL` | Frontend application origin (used in email setup links) | `http://localhost:5173` | **Yes** |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | `http://localhost:5173,http://127.0.0.1:5173` | **Yes** |
| `MAIL_HOST` | SMTP server host | `smtp.gmail.com` | Optional |
| `MAIL_PORT` | SMTP port | `587` | Optional |
| `MAIL_USERNAME` | SMTP account email address | `your_email@gmail.com` | **Yes** |
| `MAIL_PASSWORD` | SMTP app password | `your_smtp_app_password` | **Yes** |
| `GATEWAY_BASE_URL` | Base URL for Group 3 Payment Gateway | `http://localhost:8004` | **Yes** |
| `GATEWAY_INTERNAL_KEY`| Shared secret key for internal service communication | `MMSPG-SEC-KEY-2026` | **Yes** |

---

## 4. Local Development Setup with `.env`

1. Copy `.env.example` to create your local `.env` file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your local or staging database credentials, SMTP keys, and third-party secrets.
3. Run the application using the Maven wrapper:
   ```bash
   ./mvnw spring-boot:run
   ```
   On Windows PowerShell:
   ```powershell
   .\mvnw.cmd spring-boot:run
   ```
4. The application will automatically detect `.env` in the current folder, load all properties, and connect.

---

## 5. Building the Executable JAR

Run the Maven package command (skipping test execution for faster build):

### Linux / macOS:
```bash
./mvnw clean package -DskipTests
```

### Windows (PowerShell):
```powershell
.\mvnw.cmd clean package -DskipTests
```

The resulting executable archive is generated at:
```text
target/corebanking-0.0.1-SNAPSHOT.jar
```

---

## 6. Production Deployment on Linux

In production, do **NOT** use a `.env` file. Instead, pass environment variables directly to the operating system or systemd.

### Using Shell Variables
```bash
# 1. Export required environment variables
export SERVER_PORT=8080
export DB_URL="jdbc:mysql://db.production.internal:3306/corebanking?useSSL=true&serverTimezone=UTC"
export DB_USERNAME="prod_user"
export DB_PASSWORD="StrongProductionPassword123!"
export JWT_SECRET="QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWY="
export APP_JWT_SECRET="StrongStaffJwtSecretKeyWithAtLeast32Chars"
export CLOUDINARY_CLOUD_NAME="your_prod_cloud"
export CLOUDINARY_API_KEY="your_prod_api_key"
export CLOUDINARY_API_SECRET="your_prod_api_secret"
export FRONTEND_URL="https://banking.yourdomain.com"
export CORS_ALLOWED_ORIGINS="https://banking.yourdomain.com"
export MAIL_USERNAME="alerts@yourdomain.com"
export MAIL_PASSWORD="smtp_app_password"
export GATEWAY_BASE_URL="https://gateway.yourdomain.com"
export GATEWAY_INTERNAL_KEY="PROD-GATEWAY-SECRET-KEY"

# 2. Run the JAR using Java 21
java -jar target/corebanking-0.0.1-SNAPSHOT.jar
```

### Using Systemd Service (Recommended for Linux)
Create `/etc/systemd/system/corebanking.service`:

```ini
[Unit]
Description=CoreBanking Spring Boot Service
After=syslog.target network.target mysql.service

[Service]
User=corebanking
Group=corebanking
WorkingDirectory=/opt/corebanking
ExecStart=/usr/bin/java -Xms1024m -Xmx2048m -jar /opt/corebanking/corebanking-0.0.1-SNAPSHOT.jar

# Production Environment Variables
Environment="SERVER_PORT=8080"
Environment="DB_URL=jdbc:mysql://db.production.internal:3306/corebanking?useSSL=true&serverTimezone=UTC"
Environment="DB_USERNAME=prod_user"
Environment="DB_PASSWORD=StrongProductionPassword123!"
Environment="JWT_SECRET=QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWY="
Environment="APP_JWT_SECRET=StrongStaffJwtSecretKeyWithAtLeast32Chars"
Environment="CLOUDINARY_CLOUD_NAME=your_prod_cloud"
Environment="CLOUDINARY_API_KEY=your_prod_api_key"
Environment="CLOUDINARY_API_SECRET=your_prod_api_secret"
Environment="FRONTEND_URL=https://banking.yourdomain.com"
Environment="CORS_ALLOWED_ORIGINS=https://banking.yourdomain.com"
Environment="MAIL_USERNAME=alerts@yourdomain.com"
Environment="MAIL_PASSWORD=smtp_app_password"
Environment="GATEWAY_BASE_URL=https://gateway.yourdomain.com"
Environment="GATEWAY_INTERNAL_KEY=PROD-GATEWAY-SECRET-KEY"

SuccessExitStatus=143
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable corebanking
sudo systemctl start corebanking
sudo systemctl status corebanking
```

---

## 7. Production Deployment on Windows

### Using PowerShell
```powershell
$Env:SERVER_PORT = "8080"
$Env:DB_URL = "jdbc:mysql://localhost:3306/corebanking?useSSL=false&serverTimezone=UTC"
$Env:DB_USERNAME = "prod_user"
$Env:DB_PASSWORD = "StrongProductionPassword123!"
$Env:JWT_SECRET = "QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWY="
$Env:APP_JWT_SECRET = "StrongStaffJwtSecretKeyWithAtLeast32Chars"
$Env:CLOUDINARY_CLOUD_NAME = "your_prod_cloud"
$Env:CLOUDINARY_API_KEY = "your_prod_api_key"
$Env:CLOUDINARY_API_SECRET = "your_prod_api_secret"
$Env:FRONTEND_URL = "https://banking.yourdomain.com"
$Env:CORS_ALLOWED_ORIGINS = "https://banking.yourdomain.com"
$Env:MAIL_USERNAME = "alerts@yourdomain.com"
$Env:MAIL_PASSWORD = "smtp_app_password"
$Env:GATEWAY_BASE_URL = "https://gateway.yourdomain.com"
$Env:GATEWAY_INTERNAL_KEY = "PROD-GATEWAY-SECRET-KEY"

# Run using Java 21
& "C:\Program Files\Java\jdk-21\bin\java.exe" -jar target\corebanking-0.0.1-SNAPSHOT.jar
```

---

## 8. Multi-Environment Configuration (Dev, Staging, Prod)

To target different environments dynamically:

1. **Spring Profile Activation:**
   ```bash
   java -jar -Dspring.profiles.active=prod target/corebanking-0.0.1-SNAPSHOT.jar
   ```
2. **Environment Variable Override:**
   Any configuration property `foo.bar.baz` in Spring Boot can be overridden by an environment variable named `FOO_BAR_BAZ`:
   - `spring.datasource.url` ➔ `SPRING_DATASOURCE_URL` or `DB_URL`
   - `server.port` ➔ `SERVER_PORT`
   - `jwt.secret` ➔ `JWT_SECRET`

---

## 9. Security Best Practices
- **Never commit `.env` to Git.** Ensure `.gitignore` contains `.env`.
- **Rotate JWT Secrets:** Always generate distinct, cryptographic secrets for production:
  ```bash
  # Generate 32-byte Base64 secret for JWT_SECRET:
  openssl rand -base64 32
  ```
- **HTTPS & SSL in Production:** Ensure `FRONTEND_URL` and `GATEWAY_BASE_URL` use `https://` in production.
