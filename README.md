# Pet Adopt

Production hardening added for:

- Role based access control with `USER` and `ADMIN`
- Soft delete for pets and users
- Audit logging for auth and adoption lifecycle events
- Rate limiting and security middleware
- Access token plus rotating refresh token authentication
- Global error handling with production-safe responses

## API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Profile

- `GET /api/me`
- `PATCH /api/me`

### Pets

- `GET /api/pets`
- `GET /api/pets/:id`
- `POST /api/pets`
- `PATCH /api/pets/:id`
- `DELETE /api/pets/:id`
- `GET /api/pets/mine`

Legacy aliases still exist for the previous animal routes:

- `GET /api/animals`
- `GET /api/animals/:id`
- `POST /api/animals`
- `PATCH /api/animals/:id`
- `DELETE /api/animals/:id`

### Adoption Requests

- `POST /api/adoption-requests`
- `GET /api/adoption-requests`
- `PATCH /api/adoption-requests/:id/approve`
- `PATCH /api/adoption-requests/:id/reject`

### Admin

- `GET /api/admin/users`
- `GET /api/admin/pets`
- `PATCH /api/admin/users/:id/deactivate`

### Health

- `GET /health`

## Environment Variables

### Backend

- `DATABASE_URL` - Prisma database connection string
- `JWT_SECRET` - signing secret for access tokens
- `PORT` - backend listen port
- `DB_HOST` - database host when composing the connection string at runtime
- `DB_PORT` - database port when composing the connection string at runtime
- `DB_USER` - database user when composing the connection string at runtime
- `DB_NAME` - database name when composing the connection string at runtime
- `DB_PASSWORD_FILE` - path to mounted password secret
- `JWT_SECRET_FILE` - path to mounted JWT secret
- `CORS_ORIGIN` - comma separated allowed frontend origins

### Frontend

- `VITE_API_URL` - backend API base URL, default `http://localhost:5555/api`

## Authentication Flow

1. `POST /api/auth/login` verifies credentials, issues a 15 minute access token, stores a hashed refresh token in the database, and sets the refresh token in an `httpOnly` cookie.
2. The frontend stores the access token in browser storage and sends it on every request.
3. When an API call returns `401`, the axios interceptor calls `POST /api/auth/refresh` automatically.
4. Refresh token rotation occurs on every refresh call. The previous refresh token is revoked and a new hashed token is stored.
5. `POST /api/auth/logout` revokes the active refresh token and clears the cookie.

## Migrations

The schema changes are captured in:

- `backend/prisma/migrations/20260801110000_production_hardening/migration.sql`

That migration adds:

- `Role` and `AdoptionRequestStatus` enums
- `deletedAt` on `User` and `Animal`
- `RefreshToken`
- `AuditLog`
- `AdoptionRequest`

Apply migrations with the backend container entrypoint or manually:

- `npx prisma migrate deploy`

## Notes

- Soft delete means records are not physically removed; the API filters out rows where `deletedAt` is not `null`.
- Audit logs are written for register, login, pet create/update/delete, adoption request create, and adoption request approve/reject.
- Production error responses do not return stack traces.
