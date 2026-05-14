# Architecture Overview

## Recommended architecture

The system is organized as a layered monorepo:

1. Domain layer: `packages/shared/src/domain`
2. Contract layer: `packages/shared/src/contracts`
3. Data layer: `packages/db`
4. Application layer: `apps/api/src/modules`
5. Presentation layer: `apps/web` and `apps/mobile`

## Boundary rules

- Apps consume the shared package; they do not redefine statuses, roles, or schemas.
- API modules can depend on `@acme/shared` and `@acme/db`.
- Web and mobile apps depend on `@acme/shared` for contracts and validation.
- Supabase Auth owns identity, session, and token issuance.
- The API remains the orchestration layer for app-specific workflows, RBAC, and aggregation.
