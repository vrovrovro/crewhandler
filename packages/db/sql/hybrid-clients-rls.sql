create or replace function public.current_profile_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select default_organization_id
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.is_workspace_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
  )
$$;

create or replace function public.current_workspace_role(target_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.organization_members
  where organization_id = target_organization_id
    and user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_workspace_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_workspace_role(target_organization_id) in ('OWNER', 'ADMIN'), false)
$$;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists organization_members_select_own on public.organization_members;
create policy organization_members_select_own
on public.organization_members
for select
using (user_id = auth.uid());

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member
on public.organizations
for select
using (public.is_workspace_member(id));

drop policy if exists clients_select_workspace_admin on public.clients;
create policy clients_select_workspace_admin
on public.clients
for select
using (
  organization_id = public.current_profile_organization_id()
  and public.is_workspace_admin(organization_id)
);

drop policy if exists clients_insert_workspace_admin on public.clients;
create policy clients_insert_workspace_admin
on public.clients
for insert
with check (
  organization_id = public.current_profile_organization_id()
  and public.is_workspace_admin(organization_id)
);

drop policy if exists clients_update_workspace_admin on public.clients;
create policy clients_update_workspace_admin
on public.clients
for update
using (
  organization_id = public.current_profile_organization_id()
  and public.is_workspace_admin(organization_id)
)
with check (
  organization_id = public.current_profile_organization_id()
  and public.is_workspace_admin(organization_id)
);

drop policy if exists clients_delete_workspace_admin on public.clients;
create policy clients_delete_workspace_admin
on public.clients
for delete
using (
  organization_id = public.current_profile_organization_id()
  and public.is_workspace_admin(organization_id)
);

drop policy if exists interventions_select_scoped on public.interventions;
create policy interventions_select_scoped
on public.interventions
for select
using (
  organization_id = public.current_profile_organization_id()
  and (
    public.is_workspace_admin(organization_id)
    or assigned_technician_id = auth.uid()
  )
);

drop policy if exists interventions_insert_workspace_admin on public.interventions;
create policy interventions_insert_workspace_admin
on public.interventions
for insert
with check (
  organization_id = public.current_profile_organization_id()
  and public.is_workspace_admin(organization_id)
);

drop policy if exists interventions_update_workspace_admin on public.interventions;
create policy interventions_update_workspace_admin
on public.interventions
for update
using (
  organization_id = public.current_profile_organization_id()
  and public.is_workspace_admin(organization_id)
)
with check (
  organization_id = public.current_profile_organization_id()
  and public.is_workspace_admin(organization_id)
);

drop policy if exists interventions_delete_workspace_admin on public.interventions;
create policy interventions_delete_workspace_admin
on public.interventions
for delete
using (
  organization_id = public.current_profile_organization_id()
  and public.is_workspace_admin(organization_id)
);

drop policy if exists invoices_select_workspace_admin on public.invoices;
create policy invoices_select_workspace_admin
on public.invoices
for select
using (
  organization_id = public.current_profile_organization_id()
  and public.is_workspace_admin(organization_id)
);

drop policy if exists invoices_insert_workspace_admin on public.invoices;
create policy invoices_insert_workspace_admin
on public.invoices
for insert
with check (
  organization_id = public.current_profile_organization_id()
  and public.is_workspace_admin(organization_id)
);

drop policy if exists invoices_update_workspace_admin on public.invoices;
create policy invoices_update_workspace_admin
on public.invoices
for update
using (
  organization_id = public.current_profile_organization_id()
  and public.is_workspace_admin(organization_id)
)
with check (
  organization_id = public.current_profile_organization_id()
  and public.is_workspace_admin(organization_id)
);

drop policy if exists invoices_delete_workspace_admin on public.invoices;
create policy invoices_delete_workspace_admin
on public.invoices
for delete
using (
  organization_id = public.current_profile_organization_id()
  and public.is_workspace_admin(organization_id)
);

drop policy if exists invoice_items_select_workspace_admin on public.invoice_items;
create policy invoice_items_select_workspace_admin
on public.invoice_items
for select
using (
  exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.organization_id = public.current_profile_organization_id()
      and public.is_workspace_admin(invoices.organization_id)
  )
);

drop policy if exists invoice_items_insert_workspace_admin on public.invoice_items;
create policy invoice_items_insert_workspace_admin
on public.invoice_items
for insert
with check (
  exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.organization_id = public.current_profile_organization_id()
      and public.is_workspace_admin(invoices.organization_id)
  )
);

drop policy if exists invoice_items_update_workspace_admin on public.invoice_items;
create policy invoice_items_update_workspace_admin
on public.invoice_items
for update
using (
  exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.organization_id = public.current_profile_organization_id()
      and public.is_workspace_admin(invoices.organization_id)
  )
)
with check (
  exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.organization_id = public.current_profile_organization_id()
      and public.is_workspace_admin(invoices.organization_id)
  )
);

drop policy if exists invoice_items_delete_workspace_admin on public.invoice_items;
create policy invoice_items_delete_workspace_admin
on public.invoice_items
for delete
using (
  exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.organization_id = public.current_profile_organization_id()
      and public.is_workspace_admin(invoices.organization_id)
  )
);

drop policy if exists job_notes_select_scoped on public.job_notes;
create policy job_notes_select_scoped
on public.job_notes
for select
using (
  exists (
    select 1
    from public.interventions
    where interventions.id = job_notes.intervention_id
      and interventions.organization_id = public.current_profile_organization_id()
      and (
        public.is_workspace_admin(interventions.organization_id)
        or interventions.assigned_technician_id = auth.uid()
      )
  )
);

drop policy if exists job_attachments_select_scoped on public.job_attachments;
create policy job_attachments_select_scoped
on public.job_attachments
for select
using (
  exists (
    select 1
    from public.interventions
    where interventions.id = job_attachments.intervention_id
      and interventions.organization_id = public.current_profile_organization_id()
      and (
        public.is_workspace_admin(interventions.organization_id)
        or interventions.assigned_technician_id = auth.uid()
      )
  )
);
