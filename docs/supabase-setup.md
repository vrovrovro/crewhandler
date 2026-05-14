# Supabase Setup

## Required project settings

1. Create a Supabase project.
2. Copy the project URL, anon key, and service role key into `.env`.
3. In the Supabase SQL editor, run `packages/db/sql/schema.sql`.
4. Optionally run `packages/db/sql/seed.sql`.

## Auth flow

- Web/mobile sign in and sign up with Supabase Auth.
- The API trusts the Supabase access token, resolves the profile plus organization membership, and then enforces app permissions.
- New signups still need an application bootstrap step to create:
  - `organizations`
  - `profiles`
  - `organization_members`

## First admin bootstrap

- If email confirmation is disabled, the web signup page can immediately create the org and membership.
- If email confirmation is enabled, confirm the email first, sign in, and then call the bootstrap flow with an authenticated session.

## Storage recommendation

Create a Supabase Storage bucket named `job-attachments` for technician photo uploads.
