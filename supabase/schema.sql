-- ============================================================
-- SCHEMA: Sistema Síndico Profissional
-- Rodar no SQL Editor do Supabase Dashboard
-- ============================================================

-- Extensões necessárias
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABELAS
-- ============================================================

-- Perfis de usuário (estende auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  email text not null,
  avatar_url text,
  role text not null default 'owner' check (role in ('owner', 'collaborator')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Condomínios
create table if not exists public.condominiums (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  cnpj text,
  address text,
  city text,
  state text,
  units_count integer not null default 0,
  logo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Usuários por condomínio
create table if not exists public.user_condominiums (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  condo_id uuid not null references public.condominiums(id) on delete cascade,
  profile_type text not null default 'custom' check (profile_type in ('financial', 'councilor', 'janitor', 'concierge', 'custom')),
  invited_by uuid not null references public.profiles(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, condo_id)
);

-- Permissões granulares por módulo
create table if not exists public.permissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  condo_id uuid not null references public.condominiums(id) on delete cascade,
  module text not null check (module in ('financial', 'providers', 'collaborators', 'audit', 'reports', 'condominiums')),
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, condo_id, module)
);

-- Categorias contábeis
create table if not exists public.account_categories (
  id uuid primary key default uuid_generate_v4(),
  condo_id uuid not null references public.condominiums(id) on delete cascade,
  name text not null,
  type text not null check (type in ('expense', 'revenue')),
  color text,
  created_at timestamptz not null default now()
);

-- Prestadores de serviço
create table if not exists public.service_providers (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  cnpj text,
  type_of_service text not null,
  phone text,
  email text,
  status text not null default 'active' check (status in ('active', 'inactive', 'blocked')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contratos de prestadores
create table if not exists public.provider_contracts (
  id uuid primary key default uuid_generate_v4(),
  provider_id uuid not null references public.service_providers(id) on delete cascade,
  condo_id uuid not null references public.condominiums(id) on delete cascade,
  description text not null,
  start_date date not null,
  end_date date,
  value numeric(12, 2) not null,
  readjustment_index text,
  readjustment_month integer check (readjustment_month between 1 and 12),
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contas (a pagar, fixas, pagas)
create table if not exists public.accounts (
  id uuid primary key default uuid_generate_v4(),
  condo_id uuid not null references public.condominiums(id) on delete cascade,
  provider_id uuid references public.service_providers(id) on delete set null,
  category_id uuid references public.account_categories(id) on delete set null,
  description text not null,
  amount numeric(12, 2) not null,
  due_date date not null,
  paid_date date,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  is_recurring boolean not null default false,
  recurrence_rule text check (recurrence_rule in ('monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual')),
  recurrence_parent_id uuid references public.accounts(id) on delete set null,
  receipt_url text,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Logs de auditoria
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  condo_id uuid not null references public.condominiums(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  module text not null,
  action text not null check (action in ('create', 'update', 'delete', 'view', 'login', 'logout')),
  record_id uuid,
  record_description text,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

-- Convites de colaboradores
create table if not exists public.invitations (
  id uuid primary key default uuid_generate_v4(),
  condo_id uuid not null references public.condominiums(id) on delete cascade,
  email text not null,
  profile_type text not null check (profile_type in ('financial', 'councilor', 'janitor', 'concierge', 'custom')),
  permissions jsonb not null default '{}',
  token text not null unique,
  invited_by uuid not null references public.profiles(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

create index if not exists idx_condominiums_owner on public.condominiums(owner_id);
create index if not exists idx_user_condominiums_user on public.user_condominiums(user_id);
create index if not exists idx_user_condominiums_condo on public.user_condominiums(condo_id);
create index if not exists idx_permissions_user_condo on public.permissions(user_id, condo_id);
create index if not exists idx_accounts_condo on public.accounts(condo_id);
create index if not exists idx_accounts_status on public.accounts(status);
create index if not exists idx_accounts_due_date on public.accounts(due_date);
create index if not exists idx_accounts_provider on public.accounts(provider_id);
create index if not exists idx_provider_contracts_condo on public.provider_contracts(condo_id);
create index if not exists idx_provider_contracts_provider on public.provider_contracts(provider_id);
create index if not exists idx_audit_logs_condo on public.audit_logs(condo_id);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at desc);

-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_condominiums_updated_at before update on public.condominiums
  for each row execute function public.handle_updated_at();

create trigger set_providers_updated_at before update on public.service_providers
  for each row execute function public.handle_updated_at();

create trigger set_contracts_updated_at before update on public.provider_contracts
  for each row execute function public.handle_updated_at();

create trigger set_accounts_updated_at before update on public.accounts
  for each row execute function public.handle_updated_at();

-- ============================================================
-- TRIGGER: criar perfil automaticamente ao registrar
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'owner')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TRIGGER: marcar contas vencidas automaticamente
-- ============================================================

create or replace function public.update_overdue_accounts()
returns void language plpgsql security definer as $$
begin
  update public.accounts
  set status = 'overdue', updated_at = now()
  where status = 'pending'
    and due_date < current_date;
end;
$$;

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.condominiums enable row level security;
alter table public.user_condominiums enable row level security;
alter table public.permissions enable row level security;
alter table public.account_categories enable row level security;
alter table public.service_providers enable row level security;
alter table public.provider_contracts enable row level security;
alter table public.accounts enable row level security;
alter table public.audit_logs enable row level security;
alter table public.invitations enable row level security;

-- Helper: verifica se usuário tem acesso ao condomínio
create or replace function public.user_has_condo_access(p_condo_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.condominiums c
    where c.id = p_condo_id and c.owner_id = auth.uid()
    union all
    select 1 from public.user_condominiums uc
    where uc.condo_id = p_condo_id and uc.user_id = auth.uid() and uc.accepted_at is not null
  );
$$;

-- Helper: verifica permissão específica
create or replace function public.user_has_permission(p_condo_id uuid, p_module text, p_action text)
returns boolean language sql security definer stable as $$
  -- Owner sempre tem tudo
  select exists (select 1 from public.condominiums where id = p_condo_id and owner_id = auth.uid())
  or (
    p_action = 'view' and exists (select 1 from public.permissions where user_id = auth.uid() and condo_id = p_condo_id and module = p_module and can_view = true)
  ) or (
    p_action = 'create' and exists (select 1 from public.permissions where user_id = auth.uid() and condo_id = p_condo_id and module = p_module and can_create = true)
  ) or (
    p_action = 'edit' and exists (select 1 from public.permissions where user_id = auth.uid() and condo_id = p_condo_id and module = p_module and can_edit = true)
  ) or (
    p_action = 'delete' and exists (select 1 from public.permissions where user_id = auth.uid() and condo_id = p_condo_id and module = p_module and can_delete = true)
  );
$$;

-- PROFILES
create policy "Usuário vê seu próprio perfil" on public.profiles
  for select using (auth.uid() = id);
create policy "Usuário cria seu próprio perfil" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Usuário atualiza seu próprio perfil" on public.profiles
  for update using (auth.uid() = id);

-- CONDOMINIUMS
create policy "Owner vê seus condomínios" on public.condominiums
  for select using (owner_id = auth.uid() or public.user_has_condo_access(id));
create policy "Owner cria condomínios" on public.condominiums
  for insert with check (owner_id = auth.uid());
create policy "Owner atualiza seus condomínios" on public.condominiums
  for update using (owner_id = auth.uid());
create policy "Owner exclui seus condomínios" on public.condominiums
  for delete using (owner_id = auth.uid());

-- USER_CONDOMINIUMS
create policy "Acesso a user_condominiums" on public.user_condominiums
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.condominiums where id = condo_id and owner_id = auth.uid())
  );
-- Permite colaborador aceitar convite válido (token não expirado, não aceito ainda)
create policy "Colaborador aceita convite" on public.user_condominiums
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.invitations i
      where i.condo_id = condo_id
        and i.accepted_at is null
        and i.expires_at > now()
    )
  );
create policy "Owner gerencia colaboradores" on public.user_condominiums
  for delete using (
    exists (select 1 from public.condominiums where id = condo_id and owner_id = auth.uid())
  );

-- PERMISSIONS
create policy "Ver permissões do condomínio" on public.permissions
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.condominiums where id = condo_id and owner_id = auth.uid())
  );
create policy "Owner gerencia permissões" on public.permissions
  for all using (
    exists (select 1 from public.condominiums where id = condo_id and owner_id = auth.uid())
  );
-- Permite colaborador inserir suas próprias permissões ao aceitar convite
create policy "Colaborador registra suas permissões" on public.permissions
  for insert with check (user_id = auth.uid());

-- ACCOUNT_CATEGORIES
create policy "Acesso a categorias" on public.account_categories
  for select using (public.user_has_condo_access(condo_id));
create policy "Gerenciar categorias" on public.account_categories
  for all using (
    exists (select 1 from public.condominiums where id = condo_id and owner_id = auth.uid())
    or public.user_has_permission(condo_id, 'financial', 'create')
  );

-- SERVICE_PROVIDERS
create policy "Ver prestadores" on public.service_providers
  for select using (owner_id = auth.uid() or exists (
    select 1 from public.condominiums c
    join public.user_condominiums uc on uc.condo_id = c.id
    where c.owner_id = auth.uid() or (uc.user_id = auth.uid() and uc.accepted_at is not null)
    limit 1
  ));
create policy "Owner gerencia prestadores" on public.service_providers
  for all using (owner_id = auth.uid());

-- PROVIDER_CONTRACTS
create policy "Ver contratos do condomínio" on public.provider_contracts
  for select using (public.user_has_condo_access(condo_id));
create policy "Gerenciar contratos" on public.provider_contracts
  for all using (
    exists (select 1 from public.condominiums where id = condo_id and owner_id = auth.uid())
    or public.user_has_permission(condo_id, 'providers', 'create')
  );

-- ACCOUNTS
create policy "Ver contas do condomínio" on public.accounts
  for select using (
    public.user_has_condo_access(condo_id)
    and public.user_has_permission(condo_id, 'financial', 'view')
  );
create policy "Criar contas" on public.accounts
  for insert with check (
    public.user_has_condo_access(condo_id)
    and public.user_has_permission(condo_id, 'financial', 'create')
  );
create policy "Editar contas" on public.accounts
  for update using (
    public.user_has_condo_access(condo_id)
    and public.user_has_permission(condo_id, 'financial', 'edit')
  );
create policy "Excluir contas" on public.accounts
  for delete using (
    public.user_has_condo_access(condo_id)
    and public.user_has_permission(condo_id, 'financial', 'delete')
  );

-- AUDIT_LOGS
create policy "Ver logs do condomínio" on public.audit_logs
  for select using (
    public.user_has_condo_access(condo_id)
    and public.user_has_permission(condo_id, 'audit', 'view')
  );
create policy "Inserir logs" on public.audit_logs
  for insert with check (public.user_has_condo_access(condo_id));

-- INVITATIONS
create policy "Ver convites" on public.invitations
  for select using (
    invited_by = auth.uid()
    or exists (select 1 from public.condominiums where id = condo_id and owner_id = auth.uid())
  );
create policy "Owner cria convites" on public.invitations
  for insert with check (
    exists (select 1 from public.condominiums where id = condo_id and owner_id = auth.uid())
  );
create policy "Atualizar convite ao aceitar" on public.invitations
  for update using (true);

-- ============================================================
-- CATEGORIAS PADRÃO (inseridas via função)
-- ============================================================

create or replace function public.create_default_categories(p_condo_id uuid)
returns void language plpgsql security definer as $$
begin
  insert into public.account_categories (condo_id, name, type, color) values
    (p_condo_id, 'Administração', 'expense', '#6366f1'),
    (p_condo_id, 'Limpeza e Conservação', 'expense', '#22c55e'),
    (p_condo_id, 'Manutenção Predial', 'expense', '#f59e0b'),
    (p_condo_id, 'Segurança', 'expense', '#ef4444'),
    (p_condo_id, 'Energia Elétrica', 'expense', '#eab308'),
    (p_condo_id, 'Água e Esgoto', 'expense', '#06b6d4'),
    (p_condo_id, 'Gás', 'expense', '#f97316'),
    (p_condo_id, 'Internet/Telefone', 'expense', '#8b5cf6'),
    (p_condo_id, 'Seguros', 'expense', '#ec4899'),
    (p_condo_id, 'Fundo de Reserva', 'expense', '#14b8a6'),
    (p_condo_id, 'Taxa Condominial', 'revenue', '#22c55e'),
    (p_condo_id, 'Multas e Juros', 'revenue', '#f59e0b');
end;
$$;
