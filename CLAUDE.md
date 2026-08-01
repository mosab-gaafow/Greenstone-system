# Greenstone Management System — Claude Instructions

## Project Purpose

This repository contains the Greenstone Management System.

The approved business blueprint and technical blueprint are the main source of truth.

Before making changes, read:

- `docs/business-blueprint.md`
- `docs/technical-blueprint.md`
- `frontend/CLAUDE.md` when working in the frontend
- `backend/CLAUDE.md` when working in the backend

## Repository Layout

- `frontend/` — Next.js 16 application
- `backend/` — Express, Prisma, and MySQL API
- `docs/` — approved project documentation
- `scripts/` — development and production-support scripts

## General Rules

- Do not invent business requirements.
- Do not change approved workflows without explicit approval.
- Work in small implementation phases.
- Complete only the requested phase.
- Do not implement future phases early.
- Keep frontend and backend responsibilities separate.
- Do not place real company data in source control.
- Do not mix demo data with production data.
- Do not hard-delete issued financial, stock, payment, salary, receipt, or audit records.
- Keep sensitive actions traceable.
- Use transactions and audit logs for sensitive operations.
- Add or update tests when business rules are implemented or changed.
- Update documentation when an approved technical decision changes.
- Do not add unnecessary libraries.
- Prefer simple and maintainable solutions.

## Approved Technology

### Frontend

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod
- Lucide React
- Recharts
- Sonner
- next-themes

### Backend

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- MySQL
- Zod
- JWT access tokens
- Refresh tokens
- Secure HTTP-only cookies

## Data Rules

- Store money using decimal values.
- Never use floating-point values for official money calculations.
- Product pieces use whole numbers.
- Raw-material quantities may use decimal values.
- Store dates and times in UTC.
- Display user-facing dates using the Africa/Nairobi timezone.
- Official document numbers are generated only by the backend.
- Historical prices must use quotation, order, and invoice item snapshots.
- Current product data must never change old transaction prices.

## Security Rules

- Backend permission checks are mandatory.
- Hiding buttons in the frontend is not security.
- Never store access or refresh tokens in localStorage.
- Never expose secrets in frontend environment variables.
- Never log passwords, JWTs, refresh tokens, or sensitive file contents.
- Use secure HTTP-only cookies.
- Use CSRF protection for cookie-authenticated state changes.

## Demo and Production Data

Development may use safe demo data.

Demo data must:

- Be created through a clear development seed process.
- Be clearly identified.
- Be easy to remove.
- Never be mixed with production data.
- Never be inserted automatically during production deployment.

Production seeds may create only required system data such as:

- Roles
- Permissions
- Required statuses
- Required settings
- Confirmed initial product definitions
- Initial Super Admin through a safe process

## Git and Delivery Rules

- Keep changes focused.
- Do not combine unrelated phases or modules.
- Run available linting, type checking, tests, and builds before reporting completion.
- Clearly list created and changed files.
- Clearly report database migrations.
- Report warnings and unfinished items honestly.
- Never run destructive production commands automatically.
- Never force-push unless explicitly instructed.

## Current Development Process

For every phase:

1. Read the approved documentation.
2. Inspect the current repository.
3. Prepare a clear plan.
4. Wait for approval before making large changes.
5. Implement only the approved scope.
6. Run validation commands.
7. Report changed files, results, warnings, and next steps.
