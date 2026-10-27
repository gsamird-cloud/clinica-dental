-- ============================================================
-- Migración v2: segundo odontograma (tratamientos realizados)
-- y control de tratamientos pendientes.
-- Ejecutar UNA SOLA VEZ en: Supabase > SQL Editor > New query
-- No borra ni modifica los datos existentes.
-- ============================================================

-- 1. Segundo odontograma por paciente (adulto y niño)
alter table patients
  add column if not exists odontograma_trat_adulto jsonb default '{}'::jsonb,
  add column if not exists odontograma_trat_nino jsonb default '{}'::jsonb;

-- 2. Tratamientos pendientes
create table if not exists pending_treatments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  tratamiento text not null,
  piezas_dentales text,
  estado text default 'Pendiente',
  ultimo_contacto date,
  notas text,
  created_at timestamptz default now()
);

create index if not exists idx_pending_patient on pending_treatments(patient_id);

alter table pending_treatments enable row level security;

create policy "Usuarios autenticados: acceso total a pending_treatments"
  on pending_treatments for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
