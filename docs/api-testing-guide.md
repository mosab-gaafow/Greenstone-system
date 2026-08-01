# API Testing Guide

How to test the Greenstone backend with Postman, curl, or any HTTP client.

This is a practical guide. For the formal rules see `docs/api-conventions.md`.

---

## 1. The big picture

The backend has **two groups of endpoints**, and they behave differently.

| Group          | Path          | Owned by    | What it does                                         |
| -------------- | ------------- | ----------- | ---------------------------------------------------- |
| Authentication | `/api/auth/*` | Better Auth | Sign in, sign out, read the session                  |
| Business API   | `/api/v1/*`   | Greenstone  | Users, health, and later customers, orders, invoices |

Base URL in development:

```text
http://localhost:4000
```

The two groups return **different response shapes**. That is expected — Better Auth
owns its own format and Greenstone does not rewrite it.

Greenstone `/api/v1` responses always look like this:

```json
{ "success": true, "data": {}, "requestId": "..." }
```

```json
{ "success": false, "error": { "code": "...", "message": "..." }, "requestId": "..." }
```

---

## 2. Three rules you must follow

Almost every error while testing comes from breaking one of these.

### Rule 1 — You must sign in first

There is **no public registration**. `POST /api/auth/sign-up/email` always fails.
Users are created only by a Super Admin or Admin, after signing in.

### Rule 2 — Always send an `Origin` header

```text
Origin: http://localhost:3000
```

Once you have a session cookie, the server rejects any request that has no
`Origin`, because a request carrying your session cookie with no origin is
exactly what an attack looks like.

The value must exactly match `FRONTEND_ORIGIN` in `backend/.env`.

A browser sends this header automatically. Postman and curl do not, so you must
add it yourself.

### Rule 3 — Writing data needs a CSRF token

Any `POST`, `PATCH`, or `DELETE` on `/api/v1/*` needs this header:

```text
X-CSRF-Token: <token>
```

Get the token from `GET /api/v1/csrf-token`, **after** you sign in.

Reading data (`GET`) does not need it.

---

## 3. The order — follow these steps

### Step 0 — Create the first user (once only)

The database starts with no users. Run this in a terminal, not in Postman:

```bash
cd backend
pnpm create-super-admin
```

It asks for a name, an email, and a password of at least 12 characters. It
refuses to run if any user already exists.

### Step 1 — Start the backend

```bash
pnpm dev:backend
```

Check it is alive:

```http
GET http://localhost:4000/api/v1/health/ready
```

Expect `200` and `"status": "ready"`.

### Step 2 — Sign in

```http
POST http://localhost:4000/api/auth/sign-in/email
Content-Type: application/json
Origin: http://localhost:3000

{
  "email": "your@email.com",
  "password": "your-password"
}
```

Expect `200`. Postman stores the session cookie automatically. There is no token
to copy — the cookie is HTTP-only, and every later request uses it.

### Step 3 — Get a CSRF token

```http
GET http://localhost:4000/api/v1/csrf-token
Origin: http://localhost:3000
```

Response:

```json
{ "success": true, "data": { "csrfToken": "5a78c7c6...487d6" } }
```

Copy the value of `csrfToken`.

> Do this **after** signing in. The token is tied to your session. If you sign
> out and sign in again, get a new one.

### Step 4 — Read data

`GET` requests need only the `Origin` header and your cookie.

```http
GET http://localhost:4000/api/v1/users
Origin: http://localhost:3000
```

### Step 5 — Write data

Add the CSRF token as well.

```http
POST http://localhost:4000/api/v1/users
Content-Type: application/json
Origin: http://localhost:3000
X-CSRF-Token: 5a78c7c6...487d6

{
  "name": "Amina Hassan",
  "email": "amina@greenstone.co.ke",
  "password": "a-long-enough-password",
  "role": "accountant"
}
```

Expect `201 Created`.

### Summary of the order

```text
create-super-admin  →  sign in  →  get CSRF token  →  read or write
```

---

## 4. All endpoints

### Authentication — `/api/auth`

| Method | Path                      | Needs sign-in | Needs CSRF                             |
| ------ | ------------------------- | ------------- | -------------------------------------- |
| POST   | `/api/auth/sign-in/email` | No            | No                                     |
| POST   | `/api/auth/sign-out`      | Yes           | No                                     |
| GET    | `/api/auth/get-session`   | Yes           | No                                     |
| POST   | `/api/auth/sign-up/email` | —             | **Always fails. Disabled on purpose.** |

Better Auth protects these itself, using the `Origin` header. They do not use the
Greenstone CSRF token.

### System — `/api/v1`

| Method | Path                   | Needs sign-in | Needs CSRF |
| ------ | ---------------------- | ------------- | ---------- |
| GET    | `/api/v1/health/live`  | No            | No         |
| GET    | `/api/v1/health/ready` | No            | No         |
| GET    | `/api/v1/csrf-token`   | No            | No         |

`live` says the process is running. `ready` also checks the database,
configuration, and file storage.

### Users — `/api/v1/users`

**Super Admin and Admin only.** An Accountant gets `403` on every one of these.

| Method | Path                                | Needs CSRF | What it does                        |
| ------ | ----------------------------------- | ---------- | ----------------------------------- |
| GET    | `/api/v1/users`                     | No         | List users, with pagination         |
| GET    | `/api/v1/users/:id`                 | No         | One user                            |
| POST   | `/api/v1/users`                     | Yes        | Create a user                       |
| PATCH  | `/api/v1/users/:id/role`            | Yes        | Change role, and sign that user out |
| POST   | `/api/v1/users/:id/deactivate`      | Yes        | Block sign-in and end all sessions  |
| POST   | `/api/v1/users/:id/activate`        | Yes        | Allow sign-in again                 |
| POST   | `/api/v1/users/:id/revoke-sessions` | Yes        | Sign the user out everywhere        |
| POST   | `/api/v1/users/:id/capabilities`    | Yes        | Grant a capability                  |
| DELETE | `/api/v1/users/:id/capabilities`    | Yes        | Revoke a capability                 |

### List query parameters

```text
GET /api/v1/users?page=1&pageSize=25&search=amina
```

### Request bodies

Create a user:

```json
{
  "name": "Amina Hassan",
  "email": "amina@greenstone.co.ke",
  "password": "a-long-enough-password",
  "role": "accountant"
}
```

Change role:

```json
{ "role": "admin" }
```

Deactivate or activate:

```json
{ "reason": "Left the company." }
```

Grant or revoke a capability:

```json
{ "capability": "CURING_RELEASE" }
```

---

## 5. Allowed values

### Roles

| Value         | Who                                                   |
| ------------- | ----------------------------------------------------- |
| `super_admin` | Full system access                                    |
| `admin`       | Full access except a few Super Admin actions          |
| `accountant`  | Daily operations. Cannot approve payments or salaries |

### Capabilities

Only these two exist. They are granted to one user at a time, and only make
sense for an Accountant.

| Value             | What it allows           |
| ----------------- | ------------------------ |
| `CURING_RELEASE`  | Release cured products   |
| `SALARY_REGISTER` | Register salary payments |

### Password

At least 12 characters.

---

## 6. Errors and what to do

| Status | Code / message                                         | Cause                                                                       | Fix                                                          |
| ------ | ------------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 403    | `MISSING_OR_NULL_ORIGIN`                               | No `Origin` header while holding a session cookie                           | Add `Origin: http://localhost:3000`                          |
| 403    | `INVALID_ORIGIN`                                       | `Origin` does not match `FRONTEND_ORIGIN`                                   | Use the exact value from `backend/.env`                      |
| 403    | `PERMISSION_DENIED` — "Invalid or missing CSRF token." | No `X-CSRF-Token`, or it is stale                                           | Get a fresh token from `/api/v1/csrf-token`                  |
| 403    | `PERMISSION_DENIED` — other message                    | Your role is not allowed to do this                                         | Sign in as Admin or Super Admin                              |
| 401    | `AUTHENTICATION_REQUIRED`                              | Not signed in, or the session was revoked                                   | Sign in again                                                |
| 401    | `INVALID_EMAIL_OR_PASSWORD`                            | Wrong email or password                                                     | Check the credentials                                        |
| 400    | `EMAIL_PASSWORD_SIGN_UP_DISABLED`                      | You called sign-up                                                          | Correct behaviour. Create users through `POST /api/v1/users` |
| 422    | `VALIDATION_ERROR`                                     | The body is wrong. See `error.fieldErrors`                                  | Fix the named fields                                         |
| 422    | `BUSINESS_RULE_VIOLATION`                              | For example, the email already exists, or you tried to change your own role | Read the message                                             |
| 404    | `RESOURCE_NOT_FOUND`                                   | Wrong id, or wrong URL                                                      | Check both                                                   |
| 429    | "Too many requests"                                    | More than 5 sign-in attempts in a minute                                    | Wait 60 seconds                                              |

### Errors from your HTTP client, not the server

| Message                                                    | Cause                                                |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| `Header name must be a valid HTTP token [" X-CSRF-Token"]` | A **space** before the header name. Delete it        |
| `Could not send request`                                   | The backend is not running. Start `pnpm dev:backend` |

---

## 7. Postman setup

Doing this once removes most of the problems above.

### Add `Origin` to the whole collection

Right-click the **Greenstone** collection → **Edit** → **Headers** tab → add:

| Key      | Value                   |
| -------- | ----------------------- |
| `Origin` | `http://localhost:3000` |

Every request in the collection now inherits it.

### Capture the CSRF token automatically

Create an environment first — the selector at the top right must not say
"No Environment", or there is nowhere to store the value.

On the `GET /api/v1/csrf-token` request, open **Scripts** → **Post-response**:

```javascript
pm.environment.set("csrfToken", pm.response.json().data.csrfToken);
```

Then on every write request set the header value to:

```text
{{csrfToken}}
```

Now the flow is: sign in → send the CSRF request once → everything else works.

### Cookies

Postman handles the session cookie by itself. Do not copy it, and do not add an
`Authorization` header — this API does not use bearer tokens.

---

## 8. Rules that will surprise you

These are deliberate, not faults.

- **You cannot deactivate or change the role of your own account.** This stops an
  administrator locking themselves out.
- **Changing a role signs that user out** of every device, so old permissions
  cannot keep working.
- **Deactivating a user ends their sessions immediately.** They do not stay
  signed in until the session expires.
- **Sign-in is limited to 5 attempts per minute.**
- **A CSRF token stops working after you sign out.** Get a new one.
- **Passwords are never returned** by any endpoint, and never appear in an audit
  log.

---

## 9. How sessions and CSRF work

Background for the rules above. The session behaviour here was measured against
the test database, not assumed.

### Why writing needs a CSRF token

Sign-in uses a **cookie**, and a browser attaches cookies automatically — even to
requests the user never meant to send.

Suppose an Accountant is signed in to Greenstone and then opens a malicious
page containing:

```html
<form action="http://your-server/api/v1/users" method="POST"></form>
```

The browser sends that request **with the session cookie attached**, because that
is what browsers do. The server would see a valid session belonging to a real
Admin. Without protection, someone else's website has just created a user in your
system. This is called Cross-Site Request Forgery.

The defence relies on one fact: an attacker's site can **send** your cookies, but
it can never **read** them. The browser's same-origin policy forbids it.

So the server demands proof that the caller could read the CSRF cookie:

|                              | Attacker's site    | Your real frontend |
| ---------------------------- | ------------------ | ------------------ |
| Sends the session cookie     | Yes, automatically | Yes                |
| Can **read** the CSRF cookie | No, blocked        | Yes, same origin   |
| Can send `X-CSRF-Token`      | No                 | Yes                |
| Result                       | `403`              | Works              |

**Why only writes?** A `GET` should not change anything, so a forged one is
harmless. `POST`, `PATCH`, and `DELETE` create, change, and remove records, so
those are the ones worth forging.

Two extra points:

- The token is tied to **your** session, so another user's token will not work.
- `/api/auth/*` does not use this token. Better Auth protects those endpoints
  with its own `Origin` check, which is why sign-in needs no CSRF token but does
  need the `Origin` header.

### Signing in when already signed in

Measured result:

```text
after 1st sign-in : 1 session
after 2nd sign-in : 2 sessions
cookies identical : false
1st session valid : true
```

**A second, independent session is created.** Nothing is replaced, and the first
session keeps working.

This is intentional. It is how the same person stays signed in on a laptop and a
phone at once. Each device gets its own row in the `session` table.

While testing, repeated sign-ins quietly build up sessions. Your client only
keeps the newest cookie, but the older sessions remain on the server until they
expire. This is harmless. To clear them, use
`POST /api/v1/users/:id/revoke-sessions`.

### What sign-out does

Measured result:

```text
before sign-out   : 2 sessions
after sign-out    : 1 session
1st session valid : true
2nd session valid : false
```

**Sign-out ends only the session you used**, not every session.

The steps:

1. You send `POST /api/auth/sign-out` with your session cookie.
2. Better Auth finds that session row and deletes it from the database.
3. It returns a header that clears the cookie in your client.
4. That session is dead immediately.

Step 4 is the advantage of database-backed sessions. With a stateless token,
signing out cannot truly cancel anything — the token stays valid until it
expires. Here, revocation takes effect at once.

After signing out:

- `/api/v1/*` returns `401 AUTHENTICATION_REQUIRED`.
- Your **CSRF token is also dead**, because it was tied to that session. Sign in
  again and fetch a new one.

### Ending every session

| Action                                   | Effect                                       |
| ---------------------------------------- | -------------------------------------------- |
| `POST /api/auth/sign-out`                | Ends the current session only                |
| `POST /api/v1/users/:id/revoke-sessions` | Ends every session for that user             |
| `POST /api/v1/users/:id/deactivate`      | Ends every session and blocks future sign-in |

Changing a user's role also revokes all of their sessions, so a reduced set of
permissions applies immediately instead of lasting until the old session
expires.

### Session lifetime

A session lasts 7 days by default, set by `SESSION_EXPIRES_IN_SECONDS` in
`backend/.env`. It is extended when used, at most once a day.

---

## 10. What does not exist yet

Only authentication, users, and health endpoints are built.

There are no customers, products, quotations, orders, production, stock,
deliveries, invoices, payments, or reports yet. Those arrive from Phase 4 onward.
See `docs/implementation-plan.md`.
