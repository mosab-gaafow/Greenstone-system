# API Conventions

Implemented conventions for the Greenstone backend.

The approved source is `docs/technical-blueprint.md` section 5. This document
records what exists in code.

## Base paths

Greenstone business endpoints:

```text
/api/v1
```

Better Auth endpoints:

```text
/api/auth
```

Better Auth owns `/api/auth/*` completely — its routes, request and response
formats, and cookies. **The conventions in this document apply to `/api/v1`
only.** Better Auth responses must not be wrapped in the Greenstone envelope,
rewritten, or proxied.

Health endpoints live under `/api/v1` so a deployment that proxies the API paths
to Express reaches them without extra configuration.

### Implemented endpoints

System:

| Endpoint                   | Purpose                                                |
| -------------------------- | ------------------------------------------------------ |
| `GET /api/v1/health/live`  | Liveness. Never touches the database.                  |
| `GET /api/v1/health/ready` | Readiness. Checks database, configuration and storage. |
| `GET /api/v1/csrf-token`   | Issues the CSRF cookie and returns the paired token.   |

Authentication, owned by Better Auth:

| Endpoint                       | Purpose                                      |
| ------------------------------ | -------------------------------------------- |
| `POST /api/auth/sign-in/email` | Sign in with email and password.             |
| `POST /api/auth/sign-out`      | End the current session.                     |
| `GET /api/auth/get-session`    | Read the current session.                    |
| `POST /api/auth/sign-up/email` | Always rejected. Public sign-up is disabled. |

Users, restricted to Super Admin and Admin:

| Endpoint                                 | Purpose                                        |
| ---------------------------------------- | ---------------------------------------------- |
| `GET /api/v1/users`                      | Paginated list, with optional search.          |
| `GET /api/v1/users/:id`                  | One user, with active capabilities.            |
| `POST /api/v1/users`                     | Create a user.                                 |
| `PATCH /api/v1/users/:id/role`           | Change role, then revoke that user's sessions. |
| `POST /api/v1/users/:id/deactivate`      | Block sign-in and end all sessions.            |
| `POST /api/v1/users/:id/activate`        | Allow sign-in again.                           |
| `POST /api/v1/users/:id/revoke-sessions` | Sign the user out everywhere. Returns 204.     |
| `POST /api/v1/users/:id/capabilities`    | Grant an approved capability.                  |
| `DELETE /api/v1/users/:id/capabilities`  | Revoke a capability.                           |

Every mutation above writes an audit log. For request bodies and a step-by-step
testing walkthrough, see `docs/api-testing-guide.md`.

## Route naming

- Plural nouns.
- Lowercase paths.
- Hyphens between words.
- Action routes only for real business actions, for example
  `POST /api/v1/customer-payments/:id/approve`.

## HTTP methods

| Method   | Use                                       |
| -------- | ----------------------------------------- |
| `GET`    | Read data                                 |
| `POST`   | Create records, perform business actions  |
| `PATCH`  | Update allowed fields                     |
| `DELETE` | Only permitted draft or removable records |

Issued financial, stock and official documents are never permanently deleted.

## Success envelope

```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "pageSize": 25, "totalRecords": 60, "totalPages": 3 },
  "requestId": "b1f0…"
}
```

`meta` is omitted entirely when there is nothing to report.

Built by `src/shared/responses/api-response.ts`.

## Error envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The submitted information is not valid.",
    "fieldErrors": { "quantity": ["Quantity must be a positive whole number."] }
  },
  "requestId": "b1f0…"
}
```

`fieldErrors` is omitted when there are none. Stack traces are never returned in
any environment.

Produced by the single global handler in
`src/shared/middleware/error-handler.ts`.

## Error codes

Defined in `src/shared/errors/error-codes.ts`. These are part of the API
contract and must not change once released.

`VALIDATION_ERROR`, `AUTHENTICATION_REQUIRED`, `INVALID_CREDENTIALS`,
`SESSION_EXPIRED`, `PERMISSION_DENIED`, `RESOURCE_NOT_FOUND`,
`RESOURCE_CONFLICT`, `BUSINESS_RULE_VIOLATION`, `CUSTOMER_CREDIT_BLOCKED`,
`INSUFFICIENT_FINISHED_STOCK`, `INSUFFICIENT_RAW_MATERIAL`,
`CURING_NOT_COMPLETE`, `INVALID_DOCUMENT_STATUS`, `DUPLICATE_DOCUMENT`,
`FILE_VALIDATION_FAILED`, `INTERNAL_SERVER_ERROR`.

## Status codes

| Code | Meaning                                          |
| ---- | ------------------------------------------------ |
| 200  | Successful read or update                        |
| 201  | Successful creation                              |
| 204  | Success with no body                             |
| 400  | Malformed request, for example invalid JSON      |
| 401  | Authentication required                          |
| 403  | Permission denied, including a failed CSRF check |
| 404  | Record or route not found                        |
| 409  | Conflict or invalid business state               |
| 422  | Validation or business-rule failure              |
| 429  | Too many requests                                |
| 500  | Unexpected server error                          |
| 503  | Not ready to serve traffic (readiness only)      |

### Mapped database errors

| Prisma code                   | Response                 |
| ----------------------------- | ------------------------ |
| `P2002` unique violation      | 409 `DUPLICATE_DOCUMENT` |
| `P2025` record not found      | 404 `RESOURCE_NOT_FOUND` |
| `P2003` foreign key violation | 409 `RESOURCE_CONFLICT`  |

Any other database error is an unexpected 500 and its detail stays in the logs.

## Request identity

Every request receives an id, returned in the `X-Request-Id` header and in the
`requestId` field of every envelope. An inbound `X-Request-Id` is honoured only
when it matches `^[A-Za-z0-9._-]{1,128}$`, so a client cannot inject content
into logs or headers.

## Validation

Three layers, per technical blueprint section 11.1:

1. Frontend Zod validation for user experience.
2. Backend Zod validation for security — mandatory, never skipped.
3. Database constraints as the final guard.

`src/shared/validation/validate.ts` validates params, query and body. Parsed
values replace the raw ones, so handlers receive typed, coerced data and unknown
fields are stripped.

Express 5 makes `req.query` read-only, so validated query values are read with
`getValidatedQuery(res)` rather than from `req.query`.

## Data formats

- Field names use `camelCase`.
- Enum values use uppercase names.
- Dates use ISO 8601 and are stored in UTC.
- Money is returned as decimal strings, never floating-point numbers.
- Raw-material decimal quantities are returned as decimal strings.
- Piece quantities are returned as integers.

## Security

- CORS allows the single configured `FRONTEND_ORIGIN` with credentials.
- Security headers come from Helmet with a restrictive policy, since this API
  serves JSON only.
- The general rate limiter is applied to all routes. Authentication endpoints
  are rate limited by Better Auth.
- CSRF uses the double-submit pattern on `/api/v1`: a readable cookie plus a
  matching `X-CSRF-Token` header on every unsafe method. A failed check returns
  403 `PERMISSION_DENIED`. Better Auth protects `/api/auth/*` itself, using
  same-site cookies and origin checks.

## Middleware order

The Better Auth handler must be mounted **before** `express.json()`. Better Auth
reads the raw request body; parsing it first makes its requests hang rather than
fail, which is difficult to diagnose. `express.json()` is mounted after the auth
handler, so it only ever sees Greenstone routes.

## Not yet implemented

Idempotency keys for sensitive actions arrive with the phase that owns them.
See `docs/implementation-plan.md`.
