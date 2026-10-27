-- ============================================================
-- Migración v3: control de limpiezas dentales (cada 6 meses;
-- cada 3 meses en pacientes de ortodoncia).
-- Ejecutar UNA SOLA VEZ en: Supabase > SQL Editor > New query
-- No borra ni modifica los datos existentes.
-- ============================================================

-- Tipo de control del paciente: 'general' (6 meses), 'ortodoncia' (3 meses) o 'ninguno'
alter table patients
  add column if not exists tipo_control text default 'general',
  add column if not exists ultimo_aviso_control date;

-- Marca si una atención del historial incluyó limpieza dental.
-- null = aún sin clasificar (la IA o el odontólogo lo definen)
alter table treatments
  add column if not exists es_limpieza boolean;

create index if not exists idx_treatments_limpieza
  on treatments(patient_id) where es_limpieza = true;

-- Refrescar la caché de Supabase para que reconozca las columnas nuevas
notify pgrst, 'reload schema';
