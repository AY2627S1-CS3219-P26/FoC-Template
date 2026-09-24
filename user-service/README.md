# user-service

Owns user accounts, registration with email verification, login sessions and roles. It is the only component that decides authorization questions (N1.1). Every other service calls its authorization endpoint.

Node.js 24, TypeScript, Express 5, MongoDB (Mongoose)

## Running

From the repository root, `docker compose up --build` starts the service on http://localhost:3001 together with its database and Mailpit (http://localhost:8025, catches every email locally for development).

## Configuration

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port inside the container (default 3000) |
| `LOG_LEVEL` | pino log level (default `info`) |
| `MONGO_URL` | MongoDB connection string |
| `OTP_SECRET` | Key for hashing verification codes, at least 32 characters |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Outgoing email |
| `COOKIE_SECURE` | Send the session cookie over HTTPS only (default true, false in compose for local HTTP) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_USERNAME` | First administrator, created at start-up when none exists (F1.5.6) |

## API

All errors have the shape `{ "error": { "code": "...", "message": "...", "details": { ... } } }`. Validation errors list every invalid field in `details.fields`.

| Method | Path | Access | Requirement |
| --- | --- | --- | --- |
| POST | `/auth/register` | public | F1.1.1 to F1.1.6 |
| POST | `/auth/verify` | public | F1.1.5, F1.1.8 |
| POST | `/auth/verify/resend` | public | F1.1.9 |
| POST | `/auth/login` | public | F1.3.1 to F1.3.4 |
| POST | `/auth/logout` | session | |
| GET, PATCH | `/users/me` | session | F1.4.3 |
| PUT | `/users/me/password` | session | F1.4.3 |
| GET | `/users`, `/users/:id` | administrator | F1.4.1 |
| PATCH, DELETE | `/users/:id` | administrator | F1.4.2, F1.4.4 |
| PUT, DELETE | `/users/:id/roles/administrator` | administrator | F1.5.5 |
| POST | `/internal/authorize` | other services | F1.5.3 |
| GET | `/health` | public | |

## Sessions

Logging in sets the cookie `relay_session` (HttpOnly, SameSite=Lax). The token is opaque: it carries no data, and the service stores only its SHA-256 hash. A session ends after 7 days without use and after 30 days in any case (N1.3), on logout, and when the password changes (except the session that changed it).

Sessions are server-side on purpose, not JWTs: a session can be ended at once, and role changes apply on the next request.

## Authorizing requests in another service

Every other service checks access by asking this service.

1. Read the `relay_session` cookie from the incoming request.
2. Decide which role your operation needs. The platform rule is F1.5.4: `administrator` for listing, editing or deleting other accounts, suspending accounts, changing roles, deciding reports, resolving disputes and creating, updating or deactivating suppliers; `member` for everything else. Each service keeps this mapping for its own routes.
3. Call the user-service:

   ```
   POST http://user-service:3000/internal/authorize
   { "token": "<cookie value>", "requiredRole": "administrator" }
   ```

   `requiredRole` is `member` or `administrator` and defaults to `member`.

4. Handle the answer:

   ```
   200 { "decision": "authorized", "accountId": "<uuid>", "roles": ["member", "administrator"] }
   200 { "decision": "denied" }
   ```

   Proceed only on `authorized`. Use `accountId` to record who acted.

5. Fail closed (N1.1.2). A timeout, a network error, a non-200 status or any other answer means denied. Use a short timeout (about 2 seconds).

Answer a denied request with 403 and do not tell the caller whether the object it asked for exists (N1.1.1). Check the role before you look anything up.

"Requester" and "courier" are not roles (F1.5.2). Whether an account may act on a given errand is decided by the order-service from its own data, after the user-service has confirmed the account is logged in and Active.

Example for an Express service:

```ts
export function requireRole(role: "member" | "administrator"): RequestHandler {
    return async (req, res, next) => {
        try {
            const response = await fetch(`${USER_SERVICE_URL}/internal/authorize`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ token: req.cookies?.relay_session, requiredRole: role }),
                signal: AbortSignal.timeout(2000),
            });
            const result = await response.json();
            if (response.ok && result.decision === "authorized") {
                res.locals.accountId = result.accountId;
                return next();
            }
        } catch {
            // Timeout or user-service down: fall through to deny (N1.1.2).
        }
        res.status(403).json({ error: { code: "FORBIDDEN", message: "You are not allowed to do this" } });
    };
}
```

Inside the compose network the service is reachable as `http://user-service:3000`. Put that address in your service's configuration, not in code.