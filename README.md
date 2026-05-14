# Intervention Management Platform

Production-minded monorepo for a Jobber-style intervention and field service SaaS. The repository uses a single source of truth architecture so domain models, validation, roles, permissions, and API contracts are defined once and reused by the API, web dashboard, and Expo mobile app.

## Stack

- Monorepo: Turborepo + npm workspaces
- Web: Next.js App Router + React + TypeScript + Tailwind CSS
- Mobile: Expo + Expo Router + React Native + NativeWind
- API: Fastify + Supabase server client
- Database: Supabase Postgres
- Auth: Supabase Auth
- Validation: Zod
- Shared packages: domain types, schemas, permissions, contracts, API client, UI primitives, config, db

## Quick start

1. Copy `.env.example` to `.env`.
2. Create a Supabase project and fill in the URL, anon key, and service role key.
3. Install dependencies with `npm install`.
4. Apply the SQL schema in `packages/db/sql/schema.sql` to your Supabase database.
5. Optionally apply demo seed data from `packages/db/sql/seed.sql`.
6. Start the monorepo: `npm run dev`.
7. For the first admin signup, either disable email confirmation in Supabase Auth for local setup or confirm the email and then sign in before workspace bootstrap.

## Production foundation included

- SSOT domain package for enums, roles, permissions, contracts, rules, and validation
- Fastify API with Supabase-authenticated RBAC hooks and service-role data access
- Next.js App Router dashboard shell with Supabase auth integration points
- Expo Router mobile shell with Supabase auth integration points
- SQL-first schema for Supabase Postgres

## Key pages and modules

- Web: dashboard, clients, interventions, calendar, invoices, login
- Mobile: jobs list, schedule, profile, intervention detail
- API: auth, dashboard, clients, interventions, invoices

## Supabase notes

- Web and mobile authenticate directly with Supabase Auth.
- The API validates Supabase access tokens and applies app-level RBAC from `@acme/shared`.
- App data still flows through the API so business logic and contracts stay centralized.
