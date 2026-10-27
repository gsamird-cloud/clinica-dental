import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { hoyISO, traerTodo } from '../lib/controles'

const MAX_REGISTROS_POR_LOTE = 70

// Lee el historial clínico (texto libre) con IA para marcar qué atenciones fueron limpiezas
// y detectar pacientes en ortodoncia. Los nombres de pacientes nunca salen del navegador.
export default function AnalizarHistorialIA({ pacientes, onTerminado }) {
  const [analizando, setAnalizando] = useState(false)
  const [progreso, setProgreso] = useState('')
  const [error, setError] = useState('')
  const [resumen, setResumen] = useState(null) // { clasificados, limpiezas, pendientes }
  const [sugerencias, setSugerencias] = useState(null) // pacientes que parecen de ortodoncia
  const [guardando, setGuardando] = useState(false)

  async function analizar() {
    setError('')
    setResumen(null)
    setSugerencias(null)
    setAnalizando(true)
    let clasificados = 0
    let limpiezas = 0
    const orto = []
    try {
      setProgreso('Leyendo el historial clínico…')
      const registros = await traerTodo(() =>
        supabase
          .from('treatments')
          .select('id, patient_id, fecha_atencion, piezas_dentales, diagnostico, tratamiento, notas, es_limpieza')
          .order('fecha_atencion', { ascending: false })
          .order('id')
      )

      // Agrupar por paciente; analizar solo a quienes tienen registros sin clasificar
      const porPaciente = new Map()
      for (const r of registros) {
        if (!porPaciente.has(r.patient_id)) porPaciente.set(r.patient_id, [])
        porPaciente.get(r.patient_id).push(r)
      }
      const analizables = []
      for (const [pid, recs] of porPaciente) {
        const sinClasificar = recs.filter((r) => r.es_limpieza === null || r.es_limpieza === undefined).slice(0, 30)
        if (!sinClasificar.length) continue
        const contexto = recs.filter((r) => r.es_limpieza === true || r.es_limpieza === false).slice(0, 8)
        const todos = [...sinClasificar, ...contexto].sort((a, b) => (a.fecha_atencion < b.fecha_atencion ? 1 : -1))
        analizables.push({ pid, registros: todos })
      }

      if (!analizables.length) {
        setResumen({ clasificados: 0, limpiezas: 0, pendientes: 0, nada: true })
        return
      }

      // Armar lotes
      const lotes = []
      let actual = []
      let cuenta = 0
      for (const a of analizables) {
        if (actual.length && (cuenta + a.registros.length > MAX_REGISTROS_POR_LOTE || actual.length >= 40)) {
          lotes.push(actual)
          actual = []
          cuenta = 0
        }
        actual.push(a)
        cuenta += a.registros.length
      }
      if (actual.length) lotes.push(actual)

      const porId = new Map(pacientes.map((p) => [p.id, p]))

      for (let i = 0; i < lotes.length; i++) {
        setProgreso(`Analizando con IA… lote ${i + 1} de ${lotes.length}`)
        const lote = lotes[i]
        const mapaRegistros = new Map() // n -> id real
        const mapaRefs = new Map() // ref -> id paciente
        let n = 0
        const cuerpoPacientes = lote.map((a, k) => {
          const ref = `p${k + 1}`
          mapaRefs.set(ref, a.pid)
          return {
            ref,
            edad: porId.get(a.pid)?.edad || null,
            registros: a.registros.map((r) => {
              n += 1
              mapaRegistros.set(n, r)
              return {
                n,
                fecha: r.fecha_atencion,
                tratamiento: r.tratamiento,
                diagnostico: r.diagnostico,
                piezas: r.piezas_dentales,
                notas: r.notas,
                clasificado: r.es_limpieza === true ? true : r.es_limpieza === false ? false : null,
              }
            }),
          }
        })

        const { data: sesion } = await supabase.auth.getSession()
        const resp = await fetch('/.netlify/functions/analizar-historial', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sesion.session?.access_token || ''}`,
          },
          body: JSON.stringify({ hoy: hoyISO(), pacientes: cuerpoPacientes }),
        })
        if (resp.status === 404) throw new Error('El análisis con IA solo funciona en el sitio publicado en Netlify.')
        const j = await resp.json().catch(() => ({}))
        if (!resp.ok) throw new Error(j.error || 'No se pudo analizar el historial.')

        // Guardar la clasificación de registros
        const idsSi = []
        const idsNo = []
        for (const r of j.registros) {
          const real = mapaRegistros.get(r.n)
          if (!real) continue
          ;(r.es_limpieza ? idsSi : idsNo).push(real.id)
        }
        if (idsSi.length) {
          const { error } = await supabase.from('treatments').update({ es_limpieza: true }).in('id', idsSi)
          if (error) throw error
        }
        if (idsNo.length) {
          const { error } = await supabase.from('treatments').update({ es_limpieza: false }).in('id', idsNo)
          if (error) throw error
        }
        clasificados += idsSi.length + idsNo.length
        limpiezas += idsSi.length

        // Pacientes que parecen de ortodoncia y hoy figuran como "general"
        for (const p of j.pacientes) {
          const pid = mapaRefs.get(p.ref)
          const paciente = porId.get(pid)
          if (p.ortodoncia && paciente && (paciente.tipo_control || 'general') === 'general') {
            orto.push({ id: pid, nombre: paciente.nombre_completo, motivo: p.motivo, incluir: true })
          }
        }
      }

      const totalSinClasificar = analizables.reduce(
        (s, a) => s + a.registros.filter((r) => r.es_limpieza == null).length, 0
      )
      setResumen({ clasificados, limpiezas, pendientes: Math.max(totalSinClasificar - clasificados, 0) })
      setSugerencias(orto)
    } catch (e) {
      setError(
        `${e.message || 'Ocurrió un error.'}` +
          (clasificados ? ` Lo que ya se clasificó (${clasificados} registros) quedó guardado.` : '')
      )
      if (clasificados) setResumen({ clasificados, limpiezas, pendientes: 0, parcial: true })
    } finally {
      setAnalizando(false)
      setProgreso('')
      onTerminado?.()
    }
  }

  function alternar(i) {
    setSugerencias((s) => s.map((x, k) => (k === i ? { ...x, incluir: !x.incluir } : x)))
  }

  async function aplicarOrtodoncia() {
    const ids = sugerencias.filter((s) => s.incluir).map((s) => s.id)
    if (!ids.length) return
    setGuardando(true)
    const { error } = await supabase.from('patients').update({ tipo_control: 'ortodoncia' }).in('id', ids)
    setGuardando(false)
    if (error) {
      setError('No se pudo guardar: ' + error.message)
      return
    }
    setSugerencias([])
    setResumen((r) => ({ ...r, ortoAplicados: ids.length }))
    onTerminado?.()
  }

  const marcados = sugerencias?.filter((s) => s.incluir).length || 0

  return (
    <div className="card p-4 mb-5 border-pine/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[14rem]">
          <h3 className="font-display font-semibold text-pine">Analizar historial con IA</h3>
          <p className="text-xs text-ink/60 mt-0.5">
            Lee las atenciones ya registradas para marcar cuáles fueron limpiezas dentales y detectar pacientes en
            ortodoncia. Úsalo la primera vez y cada cierto tiempo para clasificar registros nuevos.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={analizar} disabled={analizando}>
          {analizando ? 'Analizando…' : 'Analizar historial'}
        </button>
      </div>

      {progreso && <p className="text-sm text-ink/60 mt-3">{progreso}</p>}
      {error && <p className="text-sm text-clay mt-3">{error}</p>}

      {resumen && !analizando && (
        <p className="text-sm text-pine mt-3">
          {resumen.nada
            ? 'No hay registros nuevos por clasificar.'
            : `Se clasificaron ${resumen.clasificados} registro(s); ${resumen.limpiezas} fueron limpiezas.` +
              (resumen.pendientes ? ` Quedan ${resumen.pendientes} por clasificar: vuelve a analizar.` : '')}
          {resumen.ortoAplicados ? ` Se marcaron ${resumen.ortoAplicados} paciente(s) como ortodoncia.` : ''}
        </p>
      )}

      {sugerencias && sugerencias.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-sm font-semibold mb-2">
            Pacientes que parecen estar en ortodoncia (limpieza cada 3 meses) — revisa y confirma:
          </p>
          <div className="space-y-2 mb-3">
            {sugerencias.map((s, i) => (
              <label
                key={s.id}
                className={`flex items-start gap-3 rounded-md border p-2.5 cursor-pointer ${
                  s.incluir ? 'border-pine bg-sage' : 'border-line opacity-60'
                }`}
              >
                <input type="checkbox" className="mt-1 w-4 h-4" checked={s.incluir} onChange={() => alternar(i)} />
                <div className="text-sm">
                  <p className="font-semibold">{s.nombre}</p>
                  {s.motivo && <p className="text-xs text-ink/70 mt-0.5">{s.motivo}</p>}
                </div>
              </label>
            ))}
          </div>
          <button type="button" className="btn-primary" onClick={aplicarOrtodoncia} disabled={!marcados || guardando}>
            {guardando ? 'Guardando…' : `Marcar ${marcados} como ortodoncia`}
          </button>
        </div>
      )}
    </div>
  )
}
