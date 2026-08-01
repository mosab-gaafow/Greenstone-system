# Seeds

Development and production seeds are kept in separate folders so they can never
run each other's data.

```text
seed/
├── development/   demo data — development only
└── production/    required system data only
```

## Status

Phase 0 creates this structure only. Both entry files are placeholders that
throw if executed. Prisma is not installed yet — it arrives in Phase 1 together
with the database connection.

| Seed                   | Command                           | Implemented in |
| ---------------------- | --------------------------------- | -------------- |
| Development demo seed  | `pnpm --filter backend seed:dev`  | Phase 4        |
| Production system seed | `pnpm --filter backend seed:prod` | Phase 2        |

## Development seed rules

The development seed may create demo records for customers, employees,
suppliers, drivers, vehicles, stock and balances.

Demo data must:

- Be clearly marked as demo data.
- Be easy to remove.
- Never depend on real company information.
- Never be mixed with production records.
- Never run automatically during a production deployment.

## Production seed rules

The production seed may create only required system data:

- Fixed roles.
- Permission definitions.
- Required status values.
- Required system settings.
- Confirmed initial product definitions.
- The initial Super Admin, through a safe process.

It must never create demo customers, employees, suppliers, drivers, vehicles,
balances, stock quantities, payments or expenses.

See `docs/business-blueprint.md` section 4 and
`docs/technical-blueprint.md` section 12.7.
