-- ============================================================
-- Esquema para el Sistema de Gestión de Clínica Dental
-- Ejecutar en: Supabase > SQL Editor > New query
-- ============================================================

create extension if not exists "uuid-ossp";

-- Tabla de pacientes -------------------------------------------------
create table if not exists patients (
  id uuid primary key default uuid_generate_v4(),
  nombre_completo text not null,
  numero_identidad text,
  telefono text,
  edad int,
  sexo text,
  direccion text,
  antecedentes text,
  odontograma_adulto jsonb default '{}'::jsonb,
  odontograma_nino jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Historia clínica: tratamientos / citas atendidas --------------------
create table if not exists treatments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  fecha_atencion date not null,
  piezas_dentales text,
  diagnostico text,
  tratamiento text,
  notas text,
  saldo_anterior numeric(10,2) default 0,
  abono numeric(10,2) default 0,
  saldo_actual numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- Agenda de citas ------------------------------------------------------
create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete set null,
  nombre_paciente text not null,
  fecha date not null,
  hora time not null,
  estado text default 'Programada',
  tratamiento text,
  telefono text,
  created_at timestamptz default now()
);

-- Índices útiles ---------------------------------------------------------
create index if not exists idx_treatments_patient on treatments(patient_id);
create index if not exists idx_treatments_fecha on treatments(fecha_atencion);
create index if not exists idx_appointments_fecha on appointments(fecha);

-- ============================================================
-- Seguridad (RLS): solo usuarios autenticados (creados manualmente
-- desde Authentication > Users en el panel de Supabase) pueden
-- leer y escribir. No hay registro público de usuarios.
-- ============================================================

alter table patients enable row level security;
alter table treatments enable row level security;
alter table appointments enable row level security;

create policy "Usuarios autenticados: acceso total a patients"
  on patients for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Usuarios autenticados: acceso total a treatments"
  on treatments for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Usuarios autenticados: acceso total a appointments"
  on appointments for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================================
-- Storage: bucket para archivos de pacientes (radiografías, fotos, PDFs)
-- Debe crearse manualmente o correr esto en el SQL Editor.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('patient-files', 'patient-files', false)
on conflict (id) do nothing;

create policy "Usuarios autenticados: leer archivos de pacientes"
  on storage.objects for select
  using (bucket_id = 'patient-files' and auth.role() = 'authenticated');

create policy "Usuarios autenticados: subir archivos de pacientes"
  on storage.objects for insert
  with check (bucket_id = 'patient-files' and auth.role() = 'authenticated');

create policy "Usuarios autenticados: eliminar archivos de pacientes"
  on storage.objects for delete
  using (bucket_id = 'patient-files' and auth.role() = 'authenticated');

create policy "Usuarios autenticados: renombrar archivos de pacientes"
  on storage.objects for update
  using (bucket_id = 'patient-files' and auth.role() = 'authenticated')
  with check (bucket_id = 'patient-files' and auth.role() = 'authenticated');
