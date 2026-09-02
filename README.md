# Sistema de Gestión — Clínica Dental

Aplicación web para gestionar pacientes, odontogramas, historia clínica, agenda de citas,
finanzas y estadísticas de un consultorio dental. Hecha con **React + Vite + Supabase**,
lista para desplegar en **Netlify**.

## Qué incluye

- **Login** con usuario y contraseña (los usuarios se crean manualmente, sin registro público).
- **Pacientes**: alta, edición y eliminación de expedientes; búsqueda por nombre o identidad.
- **Expediente de paciente**: datos generales, archivos (fotos/PDF), odontograma interactivo
  (adulto y niño, con las condiciones: cariado, endodoncia, corona, implante, fractura,
  ausente, obturado, puente) e historia clínica con tratamientos/citas, notas y control de pagos.
- **Agenda**: filtro por día, estado o nombre; alta/edición/eliminación de citas; botón para
  enviar recordatorio por WhatsApp (abre WhatsApp con el mensaje ya escrito).
- **Finanzas**: resumen de pagos filtrable por rango de fechas y control de saldos pendientes.
- **Estadísticas**: cantidad de pacientes atendidos por día, semana o mes.
- Todos los datos se guardan en la nube (Supabase), accesibles desde internet.

---

## 1. Crear el proyecto en Supabase (base de datos + login + archivos)

1. Entra a [supabase.com](https://supabase.com) y crea una cuenta gratuita.
2. Crea un **nuevo proyecto** (elige una contraseña de base de datos y guárdala).
3. Ve a **SQL Editor → New query**, pega todo el contenido del archivo
   `supabase/schema.sql` de este proyecto, y dale **Run**. Esto crea las tablas,
   los permisos de seguridad y el espacio de almacenamiento para archivos.
4. Ve a **Project Settings → API**. Copia:
   - **Project URL** → lo usarás como `VITE_SUPABASE_URL`
   - **anon public key** → lo usarás como `VITE_SUPABASE_ANON_KEY`
5. Crea el usuario del doctor/clínica manualmente: ve a **Authentication → Users → Add user**,
   escribe el correo y la contraseña que usarán para entrar al sistema. Marca
   "Auto Confirm User" para que quede activo de inmediato. Puedes agregar tantos usuarios
   como personas necesiten acceso.

## 2. Configurar el proyecto localmente

```bash
# 1. Instala las dependencias
npm install

# 2. Copia el archivo de variables de entorno y complétalo con tus datos de Supabase
cp .env.example .env
# Edita .env y coloca tu VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY

# 3. Corre el proyecto en tu computadora para probarlo
npm run dev
```

Abre `http://localhost:5173`, inicia sesión con el usuario que creaste en Supabase, y prueba
el sistema.

## 3. Publicar en Netlify

**Opción A — Arrastrando el proyecto (más simple):**

1. Corre `npm run build`. Esto genera una carpeta `dist/`.
2. Entra a [app.netlify.com](https://app.netlify.com) → **Add new site → Deploy manually**.
3. Arrastra la carpeta `dist/` a Netlify.
4. Ve a **Site configuration → Environment variables** y agrega `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY` con tus valores de Supabase.
5. Vuelve a desplegar (Netlify → Deploys → Trigger deploy) para que tome las variables.

**Opción B — Conectando tu repositorio de GitHub (recomendado, con actualizaciones automáticas):**

1. Sube este proyecto a un repositorio de GitHub.
2. En Netlify: **Add new site → Import an existing project** → elige tu repositorio.
3. Netlify detectará automáticamente el archivo `netlify.toml` (comando `npm run build`,
   carpeta `dist`).
4. Antes de desplegar, agrega las variables de entorno `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY` en **Site configuration → Environment variables**.
5. Dale **Deploy site**. Cada vez que subas cambios a GitHub, Netlify actualizará el sitio solo.

Al terminar, Netlify te da una URL pública (algo como `tuclinica.netlify.app`) accesible
desde cualquier navegador e internet.

---

## Estructura del proyecto

```
src/
  lib/supabaseClient.js     Conexión a Supabase
  context/AuthContext.jsx   Sesión de usuario (login/logout)
  components/               Sidebar, layout, ruta protegida, odontograma
  pages/
    Login.jsx
    Pacientes.jsx            Lista, alta y eliminación de pacientes
    PacienteDetalle.jsx      Expediente completo: datos, archivos, odontograma, historia clínica
    Agenda.jsx                Citas con filtros y recordatorio por WhatsApp
    Finanzas.jsx               Pagos y saldos pendientes
    Estadisticas.jsx           Pacientes atendidos por periodo
supabase/schema.sql          Script para crear las tablas y permisos en Supabase
netlify.toml                Configuración de despliegue en Netlify
```

## Notas importantes

- **Recordatorios de WhatsApp**: el botón abre WhatsApp (web o app) con el mensaje
  pre-escrito usando el enlace `wa.me`; no requiere ninguna cuenta de WhatsApp Business.
  El número debe guardarse con código de país, ej. `50499999999`.
- **Archivos de pacientes**: se guardan en el bucket privado `patient-files` de Supabase
  Storage; solo usuarios con sesión iniciada pueden verlos o subirlos.
- **Seguridad**: no hay registro público — solo el/la administrador(a) puede crear usuarios
  desde el panel de Supabase (Authentication → Users), tal como se pidió en los requerimientos.
- Si necesitas agregar más módulos o campos, cada página está separada por función para
  que sea fácil de ampliar.
