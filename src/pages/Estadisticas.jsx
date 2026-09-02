import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function getWeek(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  const firstJan = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date - firstJan) / 86400000)
  const week = Math.ceil((days + firstJan.getDay() + 1) / 7)
  return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function getMonth(dateStr) {
  return dateStr.slice(0, 7) // YYYY-MM
}

export default function Estadisticas() {
  const [tratamientos, setTratamientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('dia')

  useEffect(() => {
    supabase.from('treatments').select('fecha_atencion, patient_id')
      .then(({ data }) => { setTratamientos(data || []); setLoading(false) })
  }, [])

  const agrupador = periodo === 'dia' ? (d) => d : periodo === 'semana' ? getWeek : getMonth

  const conteos = {}
  tratamientos.forEach((t) => {
    if (!t.fecha_atencion) return
    const clave = agrupador(t.fecha_atencion)
    conteos[clave] = (conteos[clave] || 0) + 1
  })

  const filas = Object.entries(conteos).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 30)
  const max = Math.max(1, ...filas.map((f) => f[1]))

  const totalPacientesUnicos = new Set(tratamientos.map((t) => t.patient_id)).size

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <h1 className="font-display text-2xl text-pine mb-1">Estadísticas</h1>
      <p className="text-sm text-ink/60 mb-6">Cantidad de pacientes atendidos</p>

      <div className="card p-5 mb-6 inline-block">
        <p className="text-sm text-ink/50">Pacientes únicos atendidos (histórico)</p>
        <p className="font-display text-3xl text-pine">{totalPacientesUnicos}</p>
      </div>

      <div className="flex gap-2 mb-6">
        {[['dia', 'Por día'], ['semana', 'Por semana'], ['mes', 'Por mes']].map(([v, label]) => (
          <button
            key={v}
            className={periodo === v ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
            onClick={() => setPeriodo(v)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-ink/50">Cargando…</p>
      ) : filas.length === 0 ? (
        <p className="text-ink/50">Aún no hay datos suficientes.</p>
      ) : (
        <div className="card p-5 space-y-2">
          {filas.map(([clave, cantidad]) => (
            <div key={clave} className="flex items-center gap-3">
              <span className="text-xs text-ink/60 w-24 shrink-0">{clave}</span>
              <div className="flex-1 bg-sage rounded h-4 overflow-hidden">
                <div className="bg-pine2 h-full rounded" style={{ width: `${(cantidad / max) * 100}%` }} />
              </div>
              <span className="text-xs text-ink/70 w-8 text-right">{cantidad}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
