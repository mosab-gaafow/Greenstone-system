# Greenstone Backend Architecture Rules

Before planning or changing backend code, read:

- CLAUDE.md
- docs/technical-blueprint.md
- docs/business-blueprint.md
- docs/implementation-plan.md
- docs/permissions-matrix.md

For the current phase, also read the relevant file inside:

- docs/handoffs/

Do not invent business rules. Follow the documents as the source of truth.

## Module structure

Every backend business module must contain exactly six files:

- module.routes.ts
- module.controller.ts
- module.service.ts
- module.repository.ts
- module.validators.ts
- module.types.ts

Do not create module.ts or permissions.ts inside business modules.

## Dependency flow

Use this exact flow:

routes → controller → service → repository → Prisma

Rules:

- Routes contain routes and middleware connections only.
- Controllers handle Express request and response only.
- Controllers must not call Prisma or repositories directly.
- Services contain business logic, calculations, and transactions.
- Services must not use Express request or response objects.
- Repositories contain Prisma and MySQL access only.
- Repositories must not contain business decisions.
- Validators contain Zod schemas.
- Types contain module-specific TypeScript types and results.
- Cross-module access must happen through services.
- Sensitive operations require transactions and audit logs.

## Working process

Before implementation:

1. Inspect the existing code.
2. Read the relevant handoff.
3. Report conflicts or unclear requirements.
4. Prepare a focused plan.
5. Wait for approval before writing code.

After implementation:

1. Run backend typecheck.
2. Run backend lint.
3. Run relevant tests.
4. Run the complete backend test suite.
5. Run the backend build.
6. Report files created and changed.
7. Report migrations and database changes.
8. Report incomplete or excluded work honestly.

Do not commit or push without explicit permission.

Do not stop frontend or backend development processes.

Do not use browser automation.