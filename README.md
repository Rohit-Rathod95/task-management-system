# 📋 Task Management System

A production-ready full-stack task management application built with **Node.js + Express** backend and **Next.js** frontend, featuring JWT authentication via HTTP-only cookies, role-based access control, AES-256 encryption, and PostgreSQL (Supabase).

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
│   │   └── db.js                    # PostgreSQL connection pool
│   ├── controllers/
│   │   ├── auth.controller.js       # Register, Login, Logout, Refresh, GetMe
│   │   ├── task.controller.js       # CRUD with encryption + pagination
│   │   └── admin.controller.js      # Admin: users, all tasks, role mgmt
│   ├── database/
│   │   └── schema.sql               # Complete DB schema
│   ├── middleware/
│   │   ├── auth.middleware.js        # JWT verification from cookies
│   │   ├── role.middleware.js        # RBAC role checking
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
│   ├── .env                          # Environment variables
│   └── package.json
│
├── frontend/
│   └── my-app/
│       ├── app/
│       │   ├── layout.tsx            # Root layout with AuthProvider
│       │   ├── page.tsx              # Home (redirects based on auth)
│       │   ├── login/page.tsx        # Login page
│       │   ├── register/page.tsx     # Registration page
│       │   └── dashboard/page.tsx    # Dashboard with task management
│       ├── components/
│       │   ├── ProtectedRoute.tsx    # Client-side auth guard
│       │   ├── TaskCard.tsx          # User task card
│       │   ├── AdminTaskCard.tsx     # Admin task card (shows owner)
│       │   ├── TaskModal.tsx         # Create/Edit task modal
│       │   ├── DeleteDialog.tsx      # Delete confirmation dialog
│       │   ├── Pagination.tsx        # Pagination controls
│       │   ├── StatusBadge.tsx       # Color-coded status badge
│       │   └── Toast.tsx             # Toast notifications
│       ├── context/
│       │   └── AuthContext.tsx        # Auth state management
│       ├── lib/
│       │   └── api.ts                # Axios instance (withCredentials)
│       ├── services/
│       │   └── taskService.ts        # Task + Admin API calls
│       └── .env.local                # Frontend env variables
│
└── README.md
```

---

## 🔐 Authentication System

### How It Works

```
User Login → Backend validates credentials
           → Generates Access Token (JWT, 15min)
           → Generates Refresh Token (JWT, 7 days)
           → Hashes refresh token with bcrypt → stores in DB
           → Sets both tokens as HTTP-only cookies
           → Frontend never sees or stores JWT
```

### Token Strategy

| Token | Expiry | Storage | Purpose |
|-------|--------|---------|---------|
| Access Token | 15 minutes | HTTP-only cookie | API authorization |
| Refresh Token | 7 days | HTTP-only cookie + hashed in DB | Silent re-authentication |

### Cookie Configuration

```javascript
{
    httpOnly: true,                              // No JavaScript access
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod
    sameSite: "strict",                          // CSRF protection
    maxAge: <token-specific>
}
```

### Refresh Token Rotation

On every token refresh:
1. Verify the old refresh token's JWT signature
2. Find the matching hashed token in the database (`bcrypt.compare`)
3. **Revoke the old token** (set `revoked = TRUE`)
4. Generate a **new token pair** (access + refresh)
5. Store the new hashed refresh token in DB
6. Set new cookies

**Token Reuse Detection:** If a revoked token is replayed, ALL refresh tokens for that user are revoked — locking out the attacker.

### Why Hash Refresh Tokens?

If the database is compromised, attackers see hashed tokens they cannot use. Raw tokens are never stored — the same principle as password hashing.

---

## 🔒 Security Features

| Feature | Implementation |
|---------|---------------|
| **Password Hashing** | bcrypt with 12 salt rounds |
| **SQL Injection Prevention** | Parameterized queries only (`$1, $2, ...`) |
| **HTTP Security Headers** | helmet middleware |
| **Rate Limiting** | 10 login attempts per 15 minutes |
| **CSRF Protection** | SameSite=strict cookies |
| **XSS Protection** | HTTP-only cookies (no localStorage) |
| **Data Encryption** | AES-256-CBC for task descriptions |
| **RBAC** | Role-based middleware (`USER`, `ADMIN`) |
| **Centralized Errors** | No stack traces leaked in production |
| **No Hardcoded Secrets** | All secrets in environment variables |

---

## 🔑 AES-256-CBC Encryption

Task descriptions are encrypted at rest in the database.

```
Create Task → encrypt(description) → stored as hex ciphertext in PostgreSQL
Read Task   → decrypt(ciphertext) → plaintext returned to client
```

- **Algorithm:** AES-256-CBC
- **Key:** 32-byte key from `AES_KEY` env var
- **IV:** 16-byte IV from `AES_IV` env var
- **Output:** Hex-encoded ciphertext

**Why?** If the database is breached, task descriptions are unreadable without the encryption key. This is **encryption at rest** — it does NOT replace HTTPS (encryption in transit).

---

## 👥 Role-Based Access Control (RBAC)

### Roles

| Role | Permissions |
|------|-------------|
| `USER` | CRUD own tasks |
| `ADMIN` | Everything USER can do + view all users, view/delete any task, promote/demote users |

### Middleware Chain

```
Request → authenticate (verify JWT) → authorizeRoles("ADMIN") → controller
```

### Adding New Roles

To add a role like `MANAGER`:
1. `ALTER TYPE user_role ADD VALUE 'MANAGER';` in PostgreSQL
2. Use existing middleware: `authorizeRoles("ADMIN", "MANAGER")`
3. No middleware code changes needed

### First Admin Setup

```sql
-- Run in Supabase SQL Editor after registering your first user
UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

After that, admins can promote other users via: `PATCH /api/admin/users/:id/role`

---

## 📡 API Endpoints

### Auth Routes (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/register` | ✗ | Register new user |
| `POST` | `/login` | ✗ | Login (rate limited: 10/15min) |
| `POST` | `/logout` | ✗ | Revoke tokens + clear cookies |
| `POST` | `/refresh` | ✗ | Rotate refresh token |
| `GET` | `/me` | ✓ | Get current user |

### Task Routes (`/api/tasks`) — All Protected

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/` | Create task |
| `GET` | `/?page=1&limit=10&status=pending&search=deploy` | List tasks (paginated, filtered) |
| `GET` | `/:id` | Get single task |
| `PUT` | `/:id` | Update task |
| `DELETE` | `/:id` | Soft delete task |

### Admin Routes (`/api/admin`) — ADMIN Only

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users` | List all users |
| `PATCH` | `/users/:id/role` | Update user role |
| `GET` | `/tasks?page=1&limit=10&status=pending` | List all tasks (with user info) |
| `DELETE` | `/tasks/:id` | Soft delete any task |

### Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |

---

## 🗄️ Database Schema

### users

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, auto-generated |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password | VARCHAR(255) | NOT NULL (bcrypt hash) |
| role | ENUM (USER, ADMIN) | DEFAULT 'USER' |
| created_at | TIMESTAMP | DEFAULT NOW() |

### tasks

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, auto-generated |
| title | VARCHAR(255) | NOT NULL |
| description | TEXT | Encrypted (AES-256-CBC) |
| status | ENUM (pending, in-progress, completed) | DEFAULT 'pending' |
| user_id | UUID | FK → users(id), CASCADE |
| deleted_at | TIMESTAMP | NULL (soft delete) |
| created_at | TIMESTAMP | DEFAULT NOW() |

### refresh_tokens

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, auto-generated |
| user_id | UUID | FK → users(id), CASCADE |
| token | TEXT | bcrypt hash of refresh token |
| expires_at | TIMESTAMP | NOT NULL |
| created_at | TIMESTAMP | DEFAULT NOW() |
| revoked | BOOLEAN | DEFAULT FALSE |

---

## 🖥️ Frontend Features

### Authentication
- Login / Register forms with validation
- Auth state managed via React Context
- Route protection with loading spinner
- Auto-redirect based on auth status
- Logout clears cookies via API call

### Task Dashboard
- **CRUD Operations** — Create, edit, delete tasks via modals
- **Pagination** — Previous/Next with page metadata
- **Search** — Debounced search (400ms) by title
- **Filter** — Dropdown filter by status
- **Empty States** — Meaningful messages when no tasks found
- **Toast Notifications** — Success/error feedback
- **Loading States** — Spinners during API calls

### Admin View
- **Tab-based navigation** — "My Tasks" and "All Tasks (Admin)"
- Admin task cards show **task owner's name and email**
- Admin can **delete any user's task**
- **Responsive** — Mobile-friendly tab toggle

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- PostgreSQL database (Supabase recommended)
- npm

### 1. Clone the Repository

```bash
git clone https://github.com/Rohit-Rathod95/task-management-system.git
cd task-management-system
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Create `.env` file:

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

Run the schema in Supabase SQL Editor:

```bash
# Copy contents of backend/database/schema.sql and run in Supabase SQL Editor
```

Start the backend:

```bash
npm run dev
```

### 3. Setup Frontend

```bash
cd frontend/my-app
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

### 4. Create First Admin

Register a user through the app, then run in Supabase SQL Editor:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

Logout and login again to get the updated role in your JWT.

---

## 🧪 Testing the API

### Register

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","password":"Test@1234"}'
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"john@example.com","password":"Test@1234"}'
```

### Create Task (with cookies)

```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title":"Deploy app","description":"Deploy to production"}'
```

### Get Tasks (paginated + filtered)

```bash
curl "http://localhost:5000/api/tasks?page=1&limit=5&status=pending&search=deploy" \
  -b cookies.txt
```

---

## 📝 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **HTTP-only cookies over localStorage** | Prevents XSS token theft |
| **Refresh token rotation** | Prevents replay attacks; stolen tokens are single-use |
| **bcrypt for token hashing** | DB breach doesn't expose usable tokens |
| **Parameterized queries** | SQL injection prevention without ORM overhead |
| **Soft deletes** | Data recovery possible; audit trail preserved |
| **AES at application layer** | DB-agnostic; works with any PostgreSQL provider |
| **COALESCE for partial updates** | Only updates fields sent in request body |
| **Centralized error handler** | Consistent error responses; no leaked stack traces |

---

## 📄 License

ISC
