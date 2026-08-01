# Greenstone Backend — Claude Instructions

## Technology

Use:

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- MySQL
- Zod
- JWT access tokens
- Refresh tokens
- Secure HTTP-only cookies

## Source of Truth

Before implementing backend features, read:

- `../docs/business-blueprint.md`
- `../docs/technical-blueprint.md`
- `../CLAUDE.md`

Do not invent entities, fields, permissions, status changes, calculations, or workflows.

## Required Module Architecture

Every business module must contain exactly six files:

```text
modules/customers/
├── customers.routes.ts
├── customers.controller.ts
├── customers.service.ts
├── customers.repository.ts
├── customers.validators.ts
└── customers.types.ts
```

Do not add any other file inside a business module.

Do not create:

- `module.ts`
- `permissions.ts`
- Module-specific middleware files
- Module-specific model files
- Module-specific utility files

Shared concerns belong in `src/shared/`.

## Required Dependency Flow

Always follow:

```text
routes → controller → service → repository → Prisma
```

## File Responsibilities

### Routes

Routes may only:

- Define Express routes.
- Attach authentication middleware.
- Attach permission middleware.
- Attach validation middleware.
- Call controller functions.

Routes must not:

- Contain business logic.
- Perform calculations.
- Call Prisma.
- Call repositories.

### Controllers

Controllers may only:

- Read validated request information.
- Call service methods.
- Return standard API responses.

Controllers must not:

- Call Prisma.
- Call repositories.
- Contain business calculations.
- Coordinate transactions.

### Services

Services must:

- Contain all business logic.
- Perform calculations.
- Validate business states.
- Coordinate database transactions.
- Coordinate cross-module services.
- Create required audit logs.
- Enforce status transitions.
- Enforce permissions that depend on business data.

Services must not:

- Use Express `Request` or `Response` objects.
- Import another module's repository.
- Return Express responses.

### Repositories

Repositories may only:

- Access Prisma and MySQL.
- Run queries.
- Create, read, update, and delete permitted database records.
- Accept transaction clients when needed.

Repositories must not:

- Make business decisions.
- Calculate business results.
- Format HTTP responses.
- Check role permissions.

### Validators

Validators contain:

- Zod schemas for route parameters.
- Zod schemas for query parameters.
- Zod schemas for request bodies.
- File metadata validation schemas where applicable.

### Types

Types contain:

- Module-specific TypeScript types.
- Filters.
- DTOs.
- Service inputs.
- Service results.
- Allowed module-specific status types.

## Cross-Module Rules

- Cross-module access must happen through services.
- A service must never import another module's repository.
- Shared infrastructure belongs in `src/shared/`.
- Shared authentication and permissions belong in shared auth folders.
- Shared audit, numbering, storage, PDF, error, and response logic must stay outside business modules.

## Database Rules

- Use Prisma migrations.
- Use MySQL.
- Use UUID identifiers for business records.
- Store document numbers separately from internal IDs.
- Store money as `DECIMAL`.
- Never use floating-point values for money.
- Product piece quantities use integers.
- Raw-material quantities may use decimals.
- Store timestamps in UTC.
- Use database uniqueness constraints.
- Use transactions for sensitive operations.
- Use row locking or safe transactional methods for stock, balances, and numbering.
- Keep stock and balance ledgers.
- Do not hard-delete issued transactional records.
- Never edit production data through development seed files.

## Authentication Rules

- Use short-lived JWT access tokens.
- Use rotating refresh tokens.
- Store only refresh-token hashes.
- Detect refresh-token reuse.
- Revoke the token family when reuse is detected.
- Revoke sessions on logout.
- Revoke all sessions when a user is deactivated.
- Hash passwords securely.
- Never log passwords or tokens.
- Apply rate limiting to authentication endpoints.
- Use secure HTTP-only cookies.
- Use CSRF protection and origin checks for cookie-authenticated state changes.

## Permission Rules

Confirmed roles:

- Super Admin
- Admin
- Accountant

Rules:

- Permission definitions are shared.
- Do not create module-level permission files.
- Backend permission checks are mandatory.
- Support only approved user-specific capability grants.
- Capability grants and revocations must be audited.
- Default to denying actions that are not approved.

## Audit Rules

Audit logs must be:

- Append-only.
- Permanent.
- Searchable.
- Created by backend services.
- Connected to the affected record.

Sensitive actions must record:

- User
- Role snapshot
- Action
- Module
- Entity type
- Entity ID
- Document number when available
- Previous information
- Updated information
- Written reason when required
- Request ID
- Date and time

Do not store passwords, tokens, or secrets in audit logs.

Where possible, the business change and required audit log must succeed in the same transaction.

## Numbering Rules

Use the central numbering service in:

```text
src/shared/numbering/
```

Rules:

- Controllers and routes must never generate official numbers.
- Every document type has its own yearly sequence.
- Use Africa/Nairobi year for number selection.
- Sequences restart each calendar year.
- Numbers must be unique.
- Issued numbers cannot be edited.
- Cancelled, voided, reversed, or deleted numbers cannot be reused.
- Protect number generation from simultaneous requests.
- Gaps are allowed.

## File Rules

- Store file metadata in MySQL.
- Store file binaries outside MySQL.
- Use generated storage keys.
- Never trust original file names.
- Validate MIME type, file signature, and size.
- Reject executable files.
- Store files privately.
- Do not expose private storage paths.
- Use authenticated downloads or short-lived signed URLs.
- Keep customer payment evidence permanently.
- Audit permanent evidence uploads.

## PDF Rules

Official PDFs are generated by the backend for:

- Quotations
- Invoices
- Receipts

Rules:

- Load official data from the database.
- Use stored price snapshots.
- Use official backend-generated document numbers.
- Store issued PDFs permanently.
- Store checksum and generation details.
- Do not silently replace issued documents.
- Keep previous versions traceable after approved corrections.

## API Rules

Base path:

```text
/api/v1
```

Success response:

- `success`
- `data`
- optional `meta`
- `requestId`

Error response:

- `success`
- `error.code`
- `error.message`
- optional `error.fieldErrors`
- `requestId`

Rules:

- Use plural route names.
- Use lowercase paths.
- Use hyphens between words.
- Use action endpoints only for real business actions.
- Use stable application error codes.
- Never expose production stack traces.

## Validation Rules

Validation happens at three levels:

1. Frontend Zod validation
2. Backend Zod validation
3. Database constraints

Business validation belongs in services.

Examples:

- Credit checks
- Stock availability
- Curing completion
- Invoice-to-order relationship
- Payment allocation
- Approval rules
- Status transitions
- Duplicate salary-period checks

## Logging and Error Handling

- Use one global Express error handler.
- Use structured logs.
- Include request ID, method, path, status, duration, and user ID when available.
- Do not log passwords, tokens, payment proof contents, or sensitive files.
- Return safe user messages.
- Hide stack traces in production.

## Testing Rules

Test:

- Service business rules
- Repository integration with a real isolated MySQL test database
- Transactions and rollbacks
- Database constraints
- Document-number concurrency
- Authentication and permissions
- Stock reservations and dispatch
- Customer and supplier balances
- Payment approval and reversal
- Salary approval and reversal
- Audit creation
- File validation
- PDF generation

Do not report a phase complete while critical tests, type checks, or builds fail.
