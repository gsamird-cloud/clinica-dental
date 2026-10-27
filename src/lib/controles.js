// Lógica (sin IA) del control de limpiezas: fechas exactas y estados.

export const INTERVALOS = { general: 6, ortodoncia: 3 } // meses entre limpiezas
export const ETIQUETA_TIPO = {
  general: 'General · cada 6 meses',
  ortodoncia: 'Ortodoncia · cada 3 meses',
  ninguno: 'Sin control',
}

function aFecha(iso) {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(a, m - 1, d)
}

function aISO(f) {
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
}

export function hoyISO() {
  return aISO(new Date())
}

export function fechaCorta(iso) {
  if (!iso) return null
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

// Suma meses respetando fin de mes (31 ago + 6 meses = 28 feb)
export function sumarMeses(iso, n) {
  const f = aFecha(iso)
  const dia = f.getDate()
  const destino = new Date(f.getFullYear(), f.getMonth() + n, 1)
  const ultimoDia = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate()
  destino.setDate(Math.min(dia, ultimoDia))
  return aISO(destino)
}

export function diasEntre(isoA, isoB) {
  return Math.round((aFecha(isoB) - aFecha(isoA)) / 86400000)
}

export function textoDuracion(dias) {
  const n = Math.abs(dias)
  if (n === 0) return 'hoy'
  if (n < 45) return `${n} día${n === 1 ? '' : 's'}`
  const m = Math.round(n / 30)
  return `${m} mes${m === 1 ? '' : 'es'}`
}

// estado: 'vencido' | 'proximo' (en 30 días o menos) | 'al_dia' | 'sin_registro'
export function calcularControl(tipo, ultima) {
  const meses = INTERVALOS[tipo]
  if (!meses) return null
  if (!ultima) return { estado: 'sin_registro', meses }
  const proxima = sumarMeses(ultima, meses)
  const dias = diasEntre(hoyISO(), proxima)
  const estado = dias < 0 ? 'vencido' : dias <= 30 ? 'proximo' : 'al_dia'
  return { estado, meses, ultima, proxima, dias }
}

// Supabase devuelve máximo 1000 filas por consulta: esto trae todas, por páginas.
export async function traerTodo(construir) {
  const salida = []
  let desde = 0
  for (;;) {
    const { data, error } = await construir().range(desde, desde + 999)
    if (error) throw error
    salida.push(...data)
    if (data.length < 1000) break
    desde += 1000
  }
  return salida
}
