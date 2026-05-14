insert into public.organizations (id, name, slug, timezone)
values ('11111111-1111-1111-1111-111111111111', 'Demo Services', 'demo-services', 'Europe/Paris')
on conflict (slug) do nothing;

insert into public.clients (id, organization_id, name, phone, email, address, notes)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Northwind Bakery',
  '+33 6 00 00 00 00',
  'owner@northwind.example',
  '14 Rue de Lyon, Paris',
  'Prefers morning visits.'
)
on conflict (id) do nothing;
