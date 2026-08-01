# API Conventions

Implemented conventions for the Greenstone backend.

The approved source is `docs/technical-blueprint.md` section 5. This document
records what exists in code.

## Base path

```text
/api/v1
```

Health endpoints live under the same base path so the production Nginx layout,
which proxies only `/api/v1` to Express, can reach them.

| Endpoint                   | Purpose                                                |
| -------------------------- | ------------------------------------------------------ |
| `GET /api/v1/health/live`  | Liveness. Never touches the database.                  |
| `GET /api/v1/health/ready` | Readiness. Checks database, configuration and storage. |

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
  receive a stricter limiter in Phase 2.
- CSRF uses the double-submit pattern: a readable cookie plus a matching
  `X-CSRF-Token` header on every unsafe method. A failed check returns 403
  `PERMISSION_DENIED`.

## Not yet implemented

Authentication, permissions and idempotency keys for sensitive actions arrive
with the phases that own them. See `docs/implementation-plan.md`.
