-- Painel de Draetyr · tabelas do Supabase
-- Cole tudo no SQL Editor do Supabase e clique em "Run".

create table if not exists campanha (
  id int primary key default 1 check (id = 1),
  semana int not null,
  estado_semana text not null default 'aberta',
  dados jsonb not null,
  versao int not null default 1
);

create table if not exists frente (
  id text primary key,
  dono text,
  estado jsonb not null,
  versao int not null default 1
);

create table if not exists evento_log (
  id bigserial primary key,
  criado_em timestamptz not null default now(),
  autor text not null,
  semana int not null,
  frente text not null,
  tipo text not null,
  caminho text,
  antes jsonb,
  depois jsonb,
  rolagem jsonb,
  motivo text
);
create index if not exists evento_log_frente on evento_log (frente, id desc);

-- append-only: ninguém altera nem apaga o log
create or replace function evento_log_somente_insercao() returns trigger language plpgsql as $$
begin raise exception 'evento_log é somente inserção'; end $$;
drop trigger if exists evento_log_imutavel on evento_log;
create trigger evento_log_imutavel before update or delete on evento_log
  for each row execute function evento_log_somente_insercao();

create table if not exists efeito_pendente (
  id text primary key,
  criado_em timestamptz not null default now(),
  status text not null default 'pendente',
  decidido_por text,
  dados jsonb not null
);

create table if not exists snapshot_semana (
  semana int primary key,
  criado_em timestamptz not null default now(),
  estado jsonb not null
);

create table if not exists acesso (
  id text primary key,
  hash text not null unique,
  papel text not null check (papel in ('mestre', 'jogador', 'admin')),
  frente text,
  nome text not null,
  criado_em timestamptz not null default now(),
  revogado boolean not null default false
);

-- Segurança: RLS ligado e nenhuma política. Só o servidor (chave de serviço) lê e escreve.
alter table campanha enable row level security;
alter table frente enable row level security;
alter table evento_log enable row level security;
alter table efeito_pendente enable row level security;
alter table snapshot_semana enable row level security;
alter table acesso enable row level security;
