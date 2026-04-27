-- Descuento global de carrito - fase 1
-- PostgreSQL objetivo: 9.4.x
-- La feature queda apagada por defecto. Activarla solo despues de desplegar backend y frontend.

begin;

create table if not exists public.fact_descuento_global (
  id serial primary key,
  cod_sucursal numeric(6,0) not null,
  cabecera_id_num integer not null,
  tipo_comprobante char(2) not null,
  numero_int numeric(10,0) not null,
  numero_fac numeric(8,0),
  puntoventa numeric(4,0) not null,
  subtotal_bruto numeric(12,2) not null,
  descuento_monto numeric(12,2) not null,
  total_neto numeric(12,2) not null,
  usuario char(12),
  origen varchar(20) not null default 'carrito',
  created_at timestamp without time zone not null default now(),
  constraint chk_fact_descuento_global_montos
    check (
      subtotal_bruto >= 0
      and descuento_monto >= 0
      and total_neto >= 0
      and descuento_monto <= subtotal_bruto
      and (
        tipo_comprobante <> 'FC'
        or (numero_fac is not null and numero_fac > 0)
      )
    ),
  constraint uq_fact_descuento_global_operacion
    unique (cod_sucursal, tipo_comprobante, puntoventa, numero_int, cabecera_id_num)
);

create table if not exists public.app_feature_flags (
  flag_name varchar(80) primary key,
  enabled boolean not null default false,
  description varchar(255),
  updated_at timestamp without time zone not null default now()
);

insert into public.app_feature_flags (flag_name, enabled, description)
select
  'descuento_global_activo',
  false,
  'Habilita descuento global desde carrito'
where not exists (
  select 1
  from public.app_feature_flags
  where flag_name = 'descuento_global_activo'
);

commit;
