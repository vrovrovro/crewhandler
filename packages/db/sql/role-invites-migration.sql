alter table public.organization_members drop constraint if exists organization_members_role_check;
alter table public.organization_members
  add constraint organization_members_role_check
  check (role in ('OWNER', 'ADMIN', 'USER'));

update public.organization_members
set role = 'ADMIN'
where role = 'MANAGER';

update public.organization_members
set role = 'USER'
where role = 'TECHNICIAN';

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('ADMIN', 'USER')),
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'REVOKED')),
  invited_by uuid not null references public.profiles(id) on delete cascade,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_org_invites_org_email_status
  on public.organization_invitations (organization_id, email, status);
