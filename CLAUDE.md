# Greenstone Management System — Claude Instructions

## Project Purpose

This repository contains the Greenstone Management System.

The approved business blueprint, technical blueprint, and implementation plan are the source of truth.

Before making changes, read:

- `docs/business-blueprint.md`
- `docs/technical-blueprint.md`
- `docs/implementation-plan.md`
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

## Phase Control

- Follow `docs/implementation-plan.md`.
- Inspect the repository before planning.
- Prepare a plan before large changes.
- Wait for approval before implementing a phase.
- Implement only the approved phase.
- Do not start the next phase automatically.
- Report all created and changed files.
- Report tests, builds, warnings, and unfinished work honestly.

## Terminal Process Rules

- Do not stop, kill, restart, or replace an existing frontend terminal process unless explicitly instructed.
- Do not stop, kill, restart, or replace an existing backend terminal process unless explicitly instructed.
- Do not use commands such as `kill`, `killall`, `pkill`, or forced port termination.
- Do not automatically terminate a process because a port is already in use.
- Use separate terminal sessions for frontend and backend.
- Keep long-running frontend and backend development processes running.
- When a process must be restarted because of an approved configuration change, explain the reason before doing it.
- Do not close the user's terminal sessions.

## Browser Rules

- Do not use browser automation.
- Do not launch, open, control, or close browser windows or tabs automatically.
- Do not use automated browser agents to inspect the application.
- Do not use Playwright, Puppeteer, Selenium, or similar tools to control a browser unless the user explicitly approves it for a later testing task.
- Use command-line validation, unit tests, integration tests, type checking, linting, and builds during normal implementation.
- When visual checking is required, ask the user to open the page and share a screenshot.

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
- Redis (caching)
- Zod
- Better Auth
- Secure HTTP-only cookies

### Authentication

Better Auth is the only authentication framework for this project.

- Use Better Auth with Express, Prisma, and MySQL.
- Use email and password login.
- Use Better Auth database-backed sessions.
- Use the Better Auth Admin plugin and custom access control.
- Never build custom JWT access tokens, refresh tokens, refresh-token rotation,
  password hashing, session tables, authentication cookies, or authentication
  endpoints.
- Never introduce another authentication provider.

## Caching Rules

Redis is used for caching so the system stays fast and does not query the
database for every read.

- Redis is a performance layer, never the source of truth.
- The system must work correctly when Redis is unavailable.
- Cache dashboard values, lists, reports, and master-data lookups.
- Never cache a value that a transaction acts on, such as credit status, stock
  availability, balances, document numbers, or approval state.
- Every mutation invalidates the cache entries it affects, after the transaction
  commits.
- Every cache entry has a time-to-live, so a missed invalidation self-heals.
- Never store passwords, session tokens, or payment evidence in Redis.

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
- Never store session tokens or authentication data in localStorage.
- Never expose secrets in frontend environment variables.
- Never log passwords, session tokens, or sensitive file contents.
- Use secure HTTP-only cookies.
- Use CSRF protection for cookie-authenticated state changes.
- Revoke all sessions when a user is deactivated.

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
- Never use `git push --force`.
- Never reset or discard user changes without explicit permission.
- Do not commit or push unless explicitly instructed.

## Current Development Process

For every phase:

1. Read the approved documentation.
2. Inspect the current repository.
3. Check Git status.
4. Prepare a clear plan.
5. Wait for approval before large changes.
6. Implement only the approved scope.
7. Run validation commands.
8. Report changed files, results, warnings, and next steps.
9. Stop and wait for the next instruction.
