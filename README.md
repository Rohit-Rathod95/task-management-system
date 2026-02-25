# 📋 Task Management System

A production-ready, security-first task management system with **JWT authentication** (HTTP-only cookies with refresh token rotation), **AES-256-CBC encryption at rest**, **role-based access control**, and a modular **REST API** — deployed and publicly accessible.

Built with Node.js + Express, Next.js (App Router), and PostgreSQL (Supabase).

---

## 🌍 Live Deployment

| Service | URL |
|---------|-----|
| **Frontend** | [task-management-system-bryh.vercel.app](https://task-management-system-bryh.vercel.app) |
| **Backend API** | [task-management-system-4-d9dt.onrender.com](https://task-management-system-4-d9dt.onrender.com) |
| **Health Check** | [/api/health](https://task-management-system-4-d9dt.onrender.com/api/health) |

> **Note:** Backend is hosted on Render's free tier — first request may take ~30s for cold start.

---

## 📌 Executive Summary

This system implements a **defense-in-depth security architecture** across the full stack:

- **Authentication** — Short-lived access tokens (15m) + refresh token rotation with reuse detection. Refresh tokens are bcrypt-hashed before storage — a database breach does not expose usable tokens.
- **Encryption** — Task descriptions are AES-256-CBC encrypted at rest. A database leak reveals hex ciphertext, not plaintext.
- **Access Control** — Middleware-enforced RBAC with `USER` and `ADMIN` roles, extensible without code changes.
- **Infrastructure** — HTTP-only cookies (no localStorage), parameterized queries (no ORM), centralized error handling, rate limiting, and helmet security headers.

---

## 🏗️ Architecture Overview

```
Client (Next.js)
  │
  │  Axios (withCredentials: true)
  ▼
Express API (Node.js)
  │
  ├─ helmet()           → Security headers
  ├─ cors()             → Origin validation
  ├─ cookieParser()     → Extract JWT from cookies
  ├─ authenticate()     → Verify access token
  ├─ authorizeRoles()   → RBAC enforcement
  │
  ▼
Controllers
  │
  ├─ encrypt/decrypt    → AES-256-CBC (application layer)
  ├─ bcrypt             → Password + token hashing
  │
  ▼
PostgreSQL (Supabase)   → Parameterized queries only ($1, $2, ...)
```

**Separation of Concerns:** Routes define endpoints, middleware handles cross-cutting concerns (auth, validation, errors), controllers contain business logic, and utils provide reusable cryptographic functions. No business logic in routes, no DB queries in middleware.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express.js |
| **Frontend** | Next.js (App Router), React, TypeScript |
| **Database** | PostgreSQL (Supabase) |
| **Auth** | JWT (Access + Refresh Tokens), bcrypt |
| **Encryption** | AES-256-CBC (Node.js crypto) |
| **Styling** | Tailwind CSS |
| **HTTP Client** | Axios (with credentials) |
| **DB Driver** | pg (node-postgres) — no ORM |

---

## 📂 Project Structure

```
task-management-system/
├── backend/
│   ├── config/
│   │   └── db.js                    # PostgreSQL connection pool (SSL)
│   ├── controllers/
│   │   ├── auth.controller.js       # Register, Login, Logout, Refresh, GetMe
│   │   ├── task.controller.js       # CRUD with encryption + pagination
│   │   └── admin.controller.js      # Admin: users, all tasks, role mgmt
│   ├── database/
│   │   └── schema.sql               # Complete DB schema (3 tables)
│   ├── middleware/
│   │   ├── auth.middleware.js        # JWT verification from cookies
│   │   ├── role.middleware.js        # RBAC — role-based route gating
│   │   └── error.middleware.js       # Centralized error handler
│   ├── routes/
│   │   ├── auth.routes.js            # Auth endpoints + rate limiting
│   │   ├── task.routes.js            # Task CRUD (protected)
│   │   └── admin.routes.js           # Admin endpoints (ADMIN only)
│   ├── utils/
│   │   ├── jwt.util.js               # Token generation & verification
│   │   └── encryption.js             # AES-256-CBC encrypt/decrypt
│   ├── app.js                        # Express app configuration
│   ├── server.js                     # Entry point
│   └── package.json
│
├── frontend/my-app/
│   ├── app/
│   │   ├── layout.tsx                # Root layout with AuthProvider
│   │   ├── page.tsx                  # Home — redirects by auth state
│   │   ├── login/page.tsx            # Login page
│   │   ├── register/page.tsx         # Registration page
│   │   └── dashboard/page.tsx        # Task dashboard + admin view
│   ├── components/
│   │   ├── ProtectedRoute.tsx        # Client-side auth guard
│   │   ├── TaskCard.tsx              # User task card
│   │   ├── AdminTaskCard.tsx         # Admin card (shows owner info)
│   │   ├── TaskModal.tsx             # Create/Edit modal
│   │   ├── DeleteDialog.tsx          # Delete confirmation
│   │   ├── Pagination.tsx            # Page controls
│   │   ├── StatusBadge.tsx           # Color-coded status
│   │   └── Toast.tsx                 # Success/error notifications
│   ├── context/AuthContext.tsx        # Auth state management
│   ├── lib/api.ts                    # Axios (withCredentials: true)
│   └── services/taskService.ts       # Task + Admin API calls
│
└── README.md
```

---

## 🔐 Authentication Lifecycle

### Login → Token Issuance

```
POST /api/auth/login
  │
  ├─ Validate email + password (bcrypt.compare)
  ├─ Generate Access Token (JWT, 15min expiry)
  ├─ Generate Refresh Token (JWT, 7 days expiry)
  ├─ Hash refresh token (bcrypt) → store in DB
  ├─ Set both as HTTP-only, Secure, SameSite cookies
  │
  └─ Response: { user: { id, name, email, role } }
      ↑ No token in response body — cookies only
```

### Token Strategy

| Token | Expiry | Storage | Purpose |
|-------|--------|---------|---------|
| Access Token | 15 min | HTTP-only cookie | API authorization |
| Refresh Token | 7 days | HTTP-only cookie + bcrypt hash in DB | Silent re-authentication |

### Refresh Token Rotation

On every `/api/auth/refresh` call:

1. Verify the old refresh token's JWT signature
2. Find the matching hashed token in DB (`bcrypt.compare`)
3. **Revoke the old token** (`revoked = TRUE`)
4. Generate a **new token pair** (access + refresh)
5. Store the new hashed refresh token in DB
6. Set new cookies

### Token Reuse Detection

If a revoked token is replayed → ALL refresh tokens for that user are revoked, invalidating every active session. This locks out the attacker even if they intercepted a valid token.

### Why Hash Refresh Tokens?

Raw tokens are never stored. If the database is compromised, attackers see bcrypt hashes they cannot reverse — the same principle as password hashing. This is a critical layer that most implementations skip.

### Logout

```
POST /api/auth/logout → Revoke refresh token in DB → Clear both cookies
```

---

## �️ Security Hardening

| Layer | Measure | Reasoning |
|-------|---------|-----------|
| **Transport** | HTTP-only + Secure cookies | Tokens inaccessible to JavaScript; HTTPS-only in production |
| **CSRF** | SameSite=strict (dev) / none+secure (prod) | Prevents cross-site request forgery; `none` required for cross-domain deployment |
| **XSS** | No localStorage, no tokens in response body | Even if XSS occurs, attacker cannot extract auth tokens |
| **Brute Force** | Rate limiting (10 req/15min on login) | Slows credential stuffing attacks |
| **SQL Injection** | Parameterized queries (`$1, $2, ...`) | User input never interpolated into SQL strings |
| **Headers** | helmet middleware | Sets X-Content-Type-Options, X-Frame-Options, HSTS, etc. |
| **Passwords** | bcrypt with 12 salt rounds | Intentionally slow hashing; resistant to rainbow tables |
| **Data at Rest** | AES-256-CBC encryption | Task descriptions stored as hex ciphertext in DB |
| **Token Storage** | Refresh tokens bcrypt-hashed in DB | Database breach doesn't expose usable tokens |
| **Error Handling** | Centralized middleware | Stack traces hidden in production; consistent error format |
| **Secrets** | Environment variables only | No hardcoded keys in source code |

---

## 🔑 Encryption at Rest (AES-256-CBC)

```
Create/Update → encrypt(description) → hex ciphertext stored in PostgreSQL
Read (any endpoint) → decrypt(ciphertext) → plaintext returned to client
```

| Parameter | Value |
|-----------|-------|
| Algorithm | AES-256-CBC |
| Key | 32-byte value from `AES_KEY` env var |
| IV | 16-byte value from `AES_IV` env var |
| Output | Hex-encoded ciphertext |

**Key design choice:** Encryption happens at the application layer, not the database layer. This makes it database-agnostic — works with Supabase, AWS RDS, or any PostgreSQL provider without vendor-specific encryption features.

**What this protects against:** If someone accesses the database directly (SQL injection, backup theft, cloud console access), they see hex gibberish for descriptions. Without the AES key, the data is useless.

**What this does NOT replace:** HTTPS (encryption in transit). AES protects data at rest, HTTPS protects data in motion. Both are necessary.

---

## 👥 Role-Based Access Control (RBAC)

### Permission Matrix

| Action | USER | ADMIN |
|--------|:----:|:-----:|
| Create/Read/Update/Delete own tasks | ✓ | ✓ |
| View all users | ✗ | ✓ |
| View all users' tasks | ✗ | ✓ |
| Delete any user's task | ✗ | ✓ |
| Promote/demote users | ✗ | ✓ |

### Middleware Chain

```
Request → authenticate() → authorizeRoles("ADMIN") → controller
            │                      │
            └─ Verify JWT          └─ Check req.user.role
               from cookie            against allowed roles
```

### Extensibility

Adding a new role (e.g., `MANAGER`) requires:
1. `ALTER TYPE user_role ADD VALUE 'MANAGER';` in PostgreSQL
2. Use existing middleware: `authorizeRoles("ADMIN", "MANAGER")`
3. **Zero middleware code changes** — the system is designed for this

### First Admin Setup

```sql
-- Register via the app, then promote in Supabase SQL Editor:
UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
-- Logout and login again to refresh the JWT with the new role
```

After that, admins can promote other users via: `PATCH /api/admin/users/:id/role`

---

## 📡 API Reference

### Auth (`/api/auth`)

| Method | Endpoint | Auth | Rate Limited | Description |
|--------|----------|:----:|:------------:|-------------|
| `POST` | `/register` | ✗ | ✗ | Create new account |
| `POST` | `/login` | ✗ | ✓ (10/15min) | Authenticate + set cookies |
| `POST` | `/logout` | ✗ | ✗ | Revoke token + clear cookies |
| `POST` | `/refresh` | ✗ | ✗ | Rotate refresh token |
| `GET` | `/me` | ✓ | ✗ | Current user profile |

### Tasks (`/api/tasks`) — Authenticated

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/` | Create task (description encrypted) |
| `GET` | `/?page=1&limit=10&status=pending&search=deploy` | Paginated + filtered list |
| `GET` | `/:id` | Single task (description decrypted) |
| `PUT` | `/:id` | Partial update (COALESCE pattern) |
| `DELETE` | `/:id` | Soft delete (sets `deleted_at`) |

### Admin (`/api/admin`) — ADMIN Only

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users` | List all users |
| `PATCH` | `/users/:id/role` | Promote/demote user (self-protection) |
| `GET` | `/tasks` | All tasks across all users (paginated) |
| `DELETE` | `/tasks/:id` | Soft delete any task |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server status check |

---

## 🗄️ Database Schema

### `users`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, `gen_random_uuid()` |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password | VARCHAR(255) | NOT NULL (bcrypt hash) |
| role | ENUM(`USER`, `ADMIN`) | DEFAULT `USER` |
| created_at | TIMESTAMP | DEFAULT `NOW()` |

### `tasks`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, `gen_random_uuid()` |
| title | VARCHAR(255) | NOT NULL |
| description | TEXT | **AES-256-CBC encrypted** |
| status | ENUM(`pending`, `in-progress`, `completed`) | DEFAULT `pending` |
| user_id | UUID | FK → `users(id)` ON DELETE CASCADE |
| deleted_at | TIMESTAMP | NULL (soft delete marker) |
| created_at | TIMESTAMP | DEFAULT `NOW()` |

### `refresh_tokens`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, `gen_random_uuid()` |
| user_id | UUID | FK → `users(id)` ON DELETE CASCADE |
| token | TEXT | **bcrypt hash** of refresh token |
| expires_at | TIMESTAMP | NOT NULL |
| created_at | TIMESTAMP | DEFAULT `NOW()` |
| revoked | BOOLEAN | DEFAULT `FALSE` |

---

## 🖥️ Frontend

### Authentication Flow
- Login / Register with form validation and error handling
- Auth state via React Context (`useAuth` hook)
- `ProtectedRoute` component with loading spinner
- Auto-redirect: authenticated → dashboard, unauthenticated → login
- Logout calls API to revoke token + clear cookies

### Task Dashboard
- **Full CRUD** via modal forms (create, edit inline, soft delete with confirmation)
- **Pagination** — Previous/Next with total count metadata
- **Search** — Debounced input (400ms) hitting `?search=` query param
- **Filter** — Status dropdown (All, Pending, In Progress, Completed)
- **Toast notifications** — Auto-dismiss success/error feedback
- **Loading states** — Spinners during every async operation

### Admin View
- Tab-based "My Tasks" / "All Tasks (Admin)" navigation
- Admin cards display task owner's name and email
- Admin can delete any user's task (with confirmation)
- Responsive — mobile tab toggle, desktop sidebar

---

## ⚙️ Scalability & Extensibility

| Aspect | Approach |
|--------|----------|
| **New roles** | Add to PostgreSQL enum + pass to `authorizeRoles()` — no middleware changes |
| **Soft deletes** | Audit trail preserved; data recoverable; `deleted_at IS NULL` filter in queries |
| **No ORM** | Parameterized `pg` queries — full SQL control, no abstraction leaks, transparent performance |
| **DB indexing** | Indexes on `users(email)`, `tasks(user_id)`, `refresh_tokens(user_id)` support query performance at scale |
| **Encryption** | Application-layer AES — works with any PostgreSQL provider (Supabase, RDS, self-hosted) |
| **Pagination** | Limit + offset with total count — predictable performance with growing datasets |

---

## 🚀 Production Considerations

| Concern | Implementation |
|---------|---------------|
| **Cookie security** | `httpOnly`, `secure` (HTTPS), `sameSite: none` for cross-domain deployment |
| **Secrets management** | All keys/secrets in environment variables, never in source code |
| **CORS** | Strict origin validation via `CLIENT_URL` env var — no wildcard origins |
| **Error responses** | Centralized handler returns consistent JSON; stack traces hidden in production |
| **Token lifecycle** | Short-lived access (15m), rotated refresh (7d), bcrypt-hashed storage |
| **Cross-domain cookies** | `SameSite=none` + `Secure=true` for Vercel ↔ Render deployment |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- PostgreSQL database (Supabase recommended)
- npm

### 1. Clone

```bash
git clone https://github.com/Rohit-Rathod95/task-management-system.git
cd task-management-system
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env`:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
AES_KEY=exactly-32-characters-long-key!!
AES_IV=exactly-16-chars!
NODE_ENV=development
```

> ⚠️ `AES_KEY` must be exactly **32 bytes** and `AES_IV` must be exactly **16 bytes**.

Run schema in Supabase SQL Editor (copy contents of `backend/database/schema.sql`), then:

```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend/my-app
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

### 4. Create First Admin

Register via the app, then:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

Logout and login again for the new role to take effect.

---

## 🧪 API Testing (curl)

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","password":"Test@1234"}'

# Login (saves cookies)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"john@example.com","password":"Test@1234"}'

# Create Task (uses cookies)
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title":"Deploy app","description":"Deploy to production"}'

# Get Tasks (paginated + filtered)
curl "http://localhost:5000/api/tasks?page=1&limit=5&status=pending" \
  -b cookies.txt
```

---

## 📝 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **HTTP-only cookies over localStorage** | Prevents XSS token theft — tokens never accessible to JavaScript |
| **Refresh token rotation** | Stolen tokens are single-use; reuse triggers full session revocation |
| **bcrypt for token hashing** | Database breach doesn't expose usable tokens |
| **Parameterized queries (no ORM)** | SQL injection prevention with full query control and transparent performance |
| **Soft deletes** | Data recovery possible; audit trail preserved for compliance |
| **AES at application layer** | Database-agnostic encryption; portable across any PostgreSQL provider |
| **COALESCE for partial updates** | Only overwrites fields explicitly sent in the request body |
| **Centralized error handler** | Consistent error format; no leaked internals in production |

---

## 📸 Screenshots

### 🔐 Login Page
![Login Page](./screenshots/login.png)

### 📋 Dashboard
![Dashboard](./screenshots/dashboard.png)

### 👑 Admin View
![Admin View](./screenshots/admin.png) 

---

## 📄 License

ISC
