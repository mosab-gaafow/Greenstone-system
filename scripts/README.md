# Scripts

Development and production-support scripts for the Greenstone Management System.

This folder is intentionally empty in Phase 0. No scripts are written before the
functionality they support exists.

## Planned scripts

Per `docs/technical-blueprint.md` section 1.2, this folder will hold:

| Script                        | Introduced in |
| ----------------------------- | ------------- |
| Development database setup    | Phase 1       |
| Development environment setup | Phase 1       |
| Demo-data removal check       | Phase 4       |
| Production verification       | Phase 12      |

## Rules

- Scripts must never run destructive production commands automatically.
- Scripts must never insert demo business data into a production database.
- Scripts that touch a database must state which environment they target.
