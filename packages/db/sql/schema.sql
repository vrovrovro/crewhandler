create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  default_organization_id uuid references public.organizations(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('OWNER', 'ADMIN', 'USER')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

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

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.interventions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  assigned_technician_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED')),
  priority text not null default 'MEDIUM' check (priority in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  scheduled_at timestamptz,
  due_date timestamptz,
  location text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_notes (
  id uuid primary key default gen_random_uuid(),
  intervention_id uuid not null references public.interventions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.job_attachments (
  id uuid primary key default gen_random_uuid(),
  intervention_id uuid not null references public.interventions(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('PHOTO', 'DOCUMENT')),
  file_name text not null,
  file_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  intervention_id uuid not null unique references public.interventions(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID')),
  subtotal numeric(12, 2) not null,
  tax_rate numeric(5, 4) not null,
  tax_amount numeric(12, 2) not null,
  total numeric(12, 2) not null,
  issued_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10, 2) not null,
  unit_price numeric(12, 2) not null,
  total numeric(12, 2) not null
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_clients_org_name on public.clients (organization_id, name);
create index if not exists idx_interventions_org_status_schedule on public.interventions (organization_id, status, scheduled_at);
create index if not exists idx_interventions_org_assignee_schedule on public.interventions (organization_id, assigned_technician_id, scheduled_at);
create index if not exists idx_invoices_org_status_issued on public.invoices (organization_id, status, issued_at);
create index if not exists idx_activity_logs_org_created on public.activity_logs (organization_id, created_at desc);
create index if not exists idx_org_invites_org_email_status on public.organization_invitations (organization_id, email, status);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.clients enable row level security;
alter table public.interventions enable row level security;
alter table public.job_notes enable row level security;
alter table public.job_attachments enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.activity_logs enable row level security;
