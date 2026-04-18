alter table public.caja_lista
  add column if not exists rol_minimo varchar(10) not null default 'user';

alter table public.caja_conceptos
  add column if not exists rol_minimo varchar(10) not null default 'user';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'caja_lista_rol_minimo_chk'
  ) then
    alter table public.caja_lista
      add constraint caja_lista_rol_minimo_chk
      check (rol_minimo in ('user', 'admin', 'super'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'caja_conceptos_rol_minimo_chk'
  ) then
    alter table public.caja_conceptos
      add constraint caja_conceptos_rol_minimo_chk
      check (rol_minimo in ('user', 'admin', 'super'));
  end if;
end $$;

update public.caja_lista
set rol_minimo = 'user'
where rol_minimo is null or trim(rol_minimo) = '';

update public.caja_conceptos
set rol_minimo = 'user'
where rol_minimo is null or trim(rol_minimo) = '';
