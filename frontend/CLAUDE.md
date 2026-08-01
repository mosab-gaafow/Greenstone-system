# Greenstone Frontend — Claude Instructions

## Technology

Use:

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod
- Better Auth client
- Lucide React
- Recharts
- Sonner
- next-themes

## Source of Truth

Before implementing frontend features, read:

- `../docs/business-blueprint.md`
- `../docs/technical-blueprint.md`
- `../CLAUDE.md`

Do not invent pages, fields, workflows, permissions, or business rules.

## Architecture Rules

- Use Next.js App Router.
- Use Server Components by default.
- Use Client Components only when interaction is required.
- Keep route pages thin.
- Put business-area frontend logic inside `features/`.
- Use one central API client.
- Use TanStack Query for server state.
- Use React Hook Form and Zod for forms.
- Do not place authoritative business logic in frontend components.
- Do not import backend source files.
- Do not create duplicate Greenstone business APIs using Next.js route handlers.
- The Express backend is the business and data source of truth.

## Recommended Structure

- `app/` — routes, layouts, loading, error, and page shells
- `components/ui/` — shadcn/ui components
- `components/layout/` — header, sidebar, mobile navigation, page containers
- `components/shared/` — reusable shared components
- `components/forms/` — reusable form controls
- `components/data-display/` — tables, mobile cards, status badges
- `components/charts/` — Recharts wrappers
- `features/` — business-area frontend logic
- `lib/` — API client, query client, formatting, permissions, constants
- `providers/` — query and theme providers
- `hooks/` — shared hooks
- `types/` — shared frontend types

## Data Fetching

- Use TanStack Query for API data.
- All API calls must use the central API client.
- Do not scatter direct `fetch` calls across components.
- Use consistent query keys.
- Invalidate only affected queries after mutations.
- Do not automatically retry sensitive mutations.
- Keep search, filters, page, and sorting in URL parameters where practical.
- Show clear loading, empty, success, and error states.

## Authentication

Authentication uses the Better Auth client. Do not build custom authentication
logic in the frontend.

- Use the Better Auth client for sign-in and sign-out.
- Use email and password on the login page.
- Use Better Auth session APIs for current-user state.
- Authentication uses secure HTTP-only cookies.
- Do not store tokens or authentication data in localStorage or sessionStorage.
- Do not create custom token-refresh logic.
- Do not create a custom session store.
- Send credentials with API requests through the central API client.
- Redirect to login when there is no valid session.
- Show a clear session-expired message.

Greenstone business data still goes through the central API client and TanStack
Query. Only authentication goes through the Better Auth client.

## Permissions

- Use shared permission helpers for interface visibility.
- Hide or disable actions the user cannot perform.
- Backend permission checks remain mandatory.
- Do not treat hidden buttons as security.
- Show clear permission-denied feedback.

Examples:

- Accountant cannot approve or reverse customer payments.
- Accountant cannot approve, correct, or reverse salary payments.
- Customer credit override is for Admin and Super Admin.
- Conditional Accountant actions require the approved capability.

## Mobile UI Rules

- Design mobile first.
- Use one main column on small screens.
- Use cards instead of wide tables on phones.
- Use large touch targets.
- Keep one clear primary action per screen.
- Put less-used actions inside a menu.
- Keep important actions visible on long mobile forms.
- Avoid deeply nested navigation.
- Use short, simple labels.
- Do not depend only on colour for status.
- Important buttons must include text, not icons only.

## Forms

- Use React Hook Form and Zod.
- Show errors directly below fields.
- Prevent duplicate submission.
- Preserve entered data after recoverable errors.
- Confirm destructive and sensitive actions.
- Use numeric keyboards for quantities and money.
- Use searchable selectors for customers, products, suppliers, drivers, and vehicles.
- Show calculated values, but treat backend values as final.
- Do not perform official money calculations using JavaScript floating-point arithmetic.

## Display Rules

- Display currency as KES.
- Display dates using Africa/Nairobi.
- Use consistent status badges.
- Use tables on larger screens and cards on small screens.
- Use pagination for long lists.
- Use Recharts only for approved reports and dashboard information.
- Use Sonner for clear success and error messages.
- Support light and dark mode with next-themes.

## Testing

Test:

- Critical forms
- Validation messages
- Permission-based actions
- Mobile layouts
- Loading states
- Empty states
- Error states
- Calculated display values
- Major end-to-end workflows

Do not report frontend work complete while critical tests or builds fail.
