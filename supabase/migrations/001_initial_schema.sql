-- ============================================================
-- REINF - Schema Inicial
-- ============================================================

-- Habilitar extensão pgcrypto (para crypt/gen_salt)
create extension if not exists pgcrypto;

-- Tabela de cargos
create table public.roles (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz default now() not null
);

-- Tabela de perfis (vinculada a auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null,
  role_id uuid references public.roles(id) on delete set null,
  is_admin boolean default false not null,
  created_at timestamptz default now() not null
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

alter table public.roles enable row level security;
alter table public.profiles enable row level security;

-- Roles: qualquer usuário autenticado pode visualizar
create policy "Roles são visíveis para usuários autenticados"
  on public.roles for select
  to authenticated
  using (true);

-- Roles: somente admins podem inserir
create policy "Admins podem inserir roles"
  on public.roles for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- Roles: somente admins podem deletar
create policy "Admins podem deletar roles"
  on public.roles for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- Profiles: qualquer usuário autenticado pode visualizar
create policy "Profiles são visíveis para usuários autenticados"
  on public.profiles for select
  to authenticated
  using (true);

-- Profiles: service_role pode inserir (usado pelas funções SECURITY DEFINER)
create policy "Service role pode inserir profiles"
  on public.profiles for insert
  to service_role
  with check (true);

-- Profiles: admins podem atualizar
create policy "Admins podem atualizar profiles"
  on public.profiles for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- Profiles: admins podem deletar (exceto a si mesmos)
create policy "Admins podem deletar profiles"
  on public.profiles for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
    and id != auth.uid()
  );

-- ============================================================
-- Funções administrativas (SECURITY DEFINER = roda com permissões do owner)
-- ============================================================

-- Função: Criar usuário
create or replace function public.admin_create_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_user_id uuid;
begin
  -- Verificar se quem chamou é admin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ) then
    return json_build_object('error', 'Acesso negado. Somente administradores.');
  end if;

  -- Verificar se email já existe
  if exists (select 1 from auth.users where email = p_email) then
    return json_build_object('error', 'Este email já está cadastrado.');
  end if;

  new_user_id := gen_random_uuid();

  -- Criar usuário no auth.users
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    json_build_object('full_name', p_full_name)::jsonb,
    now(),
    now()
  );

  -- Criar identity
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    new_user_id,
    p_email,
    json_build_object('sub', new_user_id::text, 'email', p_email)::jsonb,
    'email',
    now(),
    now(),
    now()
  );

  -- Criar perfil
  insert into public.profiles (id, full_name, email, role_id, is_admin)
  values (new_user_id, p_full_name, p_email, p_role_id, false);

  return json_build_object('success', true, 'user_id', new_user_id);
exception
  when unique_violation then
    return json_build_object('error', 'Este email já está cadastrado.');
  when others then
    return json_build_object('error', SQLERRM);
end;
$$;

-- Função: Redefinir senha
create or replace function public.admin_reset_password(
  p_user_id uuid,
  p_password text
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Verificar se quem chamou é admin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ) then
    return json_build_object('error', 'Acesso negado. Somente administradores.');
  end if;

  -- Verificar se o usuário alvo existe
  if not exists (select 1 from auth.users where id = p_user_id) then
    return json_build_object('error', 'Usuário não encontrado.');
  end if;

  -- Atualizar a senha
  update auth.users
  set
    encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
    updated_at = now()
  where id = p_user_id;

  return json_build_object('success', true);
exception
  when others then
    return json_build_object('error', SQLERRM);
end;
$$;

-- Função: Excluir usuário
create or replace function public.admin_delete_user(
  p_user_id uuid
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Verificar se quem chamou é admin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ) then
    return json_build_object('error', 'Acesso negado. Somente administradores.');
  end if;

  -- Impedir exclusão de si mesmo
  if p_user_id = auth.uid() then
    return json_build_object('error', 'Você não pode excluir sua própria conta.');
  end if;

  -- Verificar se o usuário alvo existe
  if not exists (select 1 from auth.users where id = p_user_id) then
    return json_build_object('error', 'Usuário não encontrado.');
  end if;

  -- Deletar perfil (cascade deletará ao deletar auth.users, mas fazemos explícito)
  delete from public.profiles where id = p_user_id;

  -- Deletar identities
  delete from auth.identities where user_id = p_user_id;

  -- Deletar o usuário do auth
  delete from auth.users where id = p_user_id;

  return json_build_object('success', true);
exception
  when others then
    return json_build_object('error', SQLERRM);
end;
$$;

-- ============================================================
-- Seed: Criar usuário admin Rafael
-- ============================================================

do $$
declare
  admin_id uuid := gen_random_uuid();
begin
  -- Só cria se não existir
  if not exists (select 1 from auth.users where email = 'rafael@giacomoni.com.br') then
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      admin_id,
      'authenticated',
      'authenticated',
      'rafael@giacomoni.com.br',
      extensions.crypt('123456', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Rafael"}'::jsonb,
      now(),
      now()
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(),
      admin_id,
      'rafael@giacomoni.com.br',
      json_build_object('sub', admin_id::text, 'email', 'rafael@giacomoni.com.br')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    insert into public.profiles (id, full_name, email, is_admin)
    values (admin_id, 'Rafael', 'rafael@giacomoni.com.br', true);

    raise notice 'Admin Rafael criado com sucesso!';
  else
    raise notice 'Admin Rafael já existe.';
  end if;
end;
$$;
