# Community Multisports Portal — Backend Database, Auth & RBAC Manual

**Project Scope:** Year-Long Series (October 2026 – October 2027)  
**Supported Sports:** Pickleball, Paddle Ball, Box Cricket  
**Core Principles:** Permanent Player Accounts + Event-Wise Confirmation + Zero-Overbooking Guarantees  

---

## 1. Architectural Overview & Security Design

The backend is built as an enterprise-grade RESTful API service supporting dual-mode database access:
- **Production Mode:** PostgreSQL 16+ with ACID transaction isolation and explicit row-level locking (`SELECT ... FOR UPDATE`).
- **Development & Testing Mode:** Native high-performance `node:sqlite` (built into Node.js v22/v24) with strict foreign key constraints (`PRAGMA foreign_keys = ON;`).

### Core Security Mandates:
1. **No Fixed / Default Passwords:** Accounts created via registration are initialized in `PENDING_PASSWORD` status with an expiring cryptographic activation token. No vulnerable defaults (e.g. `Welcome@123`) are ever used.
2. **Password Hashing:** Passwords are encrypted with `bcrypt` (10 rounds) or Argon2id.
3. **Permanent Unique Player IDs:** Deterministic prefixes based on gender (`MP1001` for Male, `FP1001` for Female, `JP1001` for Other) with sequential numbering.
4. **Duplicate Registration Prevention:** Safe handling of duplicate emails and phone numbers returning clean HTTP 409 responses with the existing Player ID instead of raw DB error crashes.
5. **Secure Initial Admin Bootstrap:** Dedicated CLI script and token-gated endpoint that permanently lock once the first administrator account is created.
6. **No Privileged Credentials on Client:** Client-side bundles only receive public profile identifiers. Password hashes and internal credentials are never transmitted.

---

## 2. Environment Variables Documentation

All configuration is managed through environment variables (template provided in `.env.example`):

| Variable | Type | Default Value | Description |
|---|---|---|---|
| `PORT` | Integer | `5000` | Port on which the Express server listens. |
| `NODE_ENV` | String | `development` | Environment mode (`development`, `production`, `test`). |
| `DATABASE_URL` | String | `sqlite:./server/database/community_multisports.db` | Connection URI. Supports `postgresql://user:pass@host:5432/db` or `sqlite:<path>`. |
| `JWT_SECRET` | String | *(Cryptographic string)* | High-entropy secret key used to sign and verify session tokens. |
| `JWT_EXPIRES_IN` | String | `7d` | Token expiration lifetime (e.g., `7d`, `24h`). |
| `ADMIN_SETUP_SECRET` | String | *(Bootstrap secret)* | High-entropy secret required to bootstrap the initial root admin via API. |
| `PASSWORD_TOKEN_EXPIRES_HOURS` | Integer | `24` | Validity window for password setup / reset tokens. |

---

## 3. Database Setup & Migrations

### Dual-Database Compatibility
- **PostgreSQL Setup:** Create your database and set `DATABASE_URL=postgresql://user:password@localhost:5432/jito_multisports` in `.env`.
- **SQLite Setup (Zero-Config):** Simply leave `DATABASE_URL` default. The database file will be created automatically at `server/database/community_multisports.db`.

### Running Migrations
To apply all SQL migrations in order:
```bash
node server/database/migrator.js
```
*Or using npm:*
```bash
npm run migrate
```

Migrations directory: [`server/database/migrations/`](file:///c:/MAIN/Jito%20Sports%20event/server/database/migrations)
- `001_initial_schema.sql`: Creates tables (`users`, `player_preferences`, `password_reset_tokens`, `sports`, `courts`, `events`, `event_confirmations`, `event_slots`, `bookings`, `waitlists`, `audit_logs`).
- `002_seed_initial_data.sql`: Seeds sports configurations, 10 pickleball courts, 4 paddle courts, 2 turf cricket arenas, and Round 1 Opening Night event.

---

## 4. Secure Initial Administrator Setup Process

To establish the root administrator account securely without exposing credentials on the client, run the CLI bootstrap tool:

```bash
node server/scripts/setup-admin.js --name "Master Admin" --email "admin@jito.org" --phone "+91 99999 00000" --password "YourStrongPassword123!"
```
*Or using npm:*
```bash
npm run setup-admin
```

### Self-Locking Security Guard:
The moment an account with `role = 'ADMIN'` exists, all subsequent bootstrap attempts (via CLI or `POST /api/admin/initial-setup`) are **permanently locked** with an HTTP 403 Forbidden.

---

## 5. Role-Based Access Control (RBAC) Matrix

| Endpoint | Action | Anonymous | PLAYER | COORDINATOR | ADMIN |
|---|---|:---:|:---:|:---:|:---:|
| `POST /api/auth/register` | Register permanent profile | ✅ | ❌ | ❌ | ❌ |
| `POST /api/auth/login` | Sign in with Player ID/Email | ✅ | ✅ | ✅ | ✅ |
| `POST /api/auth/setup-password` | Set password via token | ✅ (with token) | ✅ | ✅ | ✅ |
| `GET /api/players/profile` | View own profile & preferences | ❌ | ✅ | ✅ | ✅ |
| `PUT /api/players/:id` | Update profile | ❌ | ✅ (Self only) | ❌ | ✅ (Any) |
| `GET /api/players/:id/bookings` | View confirmed booking history | ❌ | ✅ (Self only) | ✅ | ✅ |
| `GET /api/admin/players` | Search full player directory | ❌ | ❌ | ✅ | ✅ |
| `PUT /api/admin/players/:id/role` | Escalate / demote user role | ❌ | ❌ | ❌ | ✅ |
| `PUT /api/admin/players/:id/status` | Suspend or reactivate account | ❌ | ❌ | ✅ | ✅ |
| `GET /api/admin/metrics` | View dashboard utilization stats | ❌ | ❌ | ✅ | ✅ |

---

## 6. Running the Server

Start the full-stack server (serving both the public website and API):
```bash
node server/server.js
```
*Or:*
```bash
npm start
```
The server will start at `http://localhost:5000`.

---

## 7. Running the Automated Test Suite

The test suite validates registration, deterministic player IDs, duplicate account safety, cryptographic token activation, login checks, profile update boundaries, and RBAC security:

```bash
node tests/auth_and_rbac.test.js
```
*Or:*
```bash
npm test
```

### Verified Test Results (20/20 Passing):
- **Suite 1:** Male registration (`MP1001`), female registration (`FP1001`), sequential allocation (`MP1002`).
- **Suite 2:** Duplicate email safe rejection (409), duplicate phone safe rejection (409).
- **Suite 3:** Token single-use enforcement, invalid token rejection, valid token activation.
- **Suite 4:** Player ID login, Email login, wrong password rejection, pending password rejection.
- **Suite 5:** Self-update permissions, cross-user tampering rejection (403), privilege escalation blocking.
- **Suite 6:** Root admin bootstrap, second bootstrap locking (403), player directory inspection, role updates, account suspension enforcement.
