import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const CAMPOS = ['odontograma_adulto', 'odontograma_nino', 'odontograma_trat_adulto', 'odontograma_trat_nino']

function Chispa() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16z" />
    </svg>
  )
}

// Compara el odontograma de estado con el de tratamientos realizados y propone pendientes.
export default function DetectarPendientesIA({ paciente, onAgregado }) {
  const [analizando, setAnalizando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [propuesta, setPropuesta] = useState(null) // { sugerencias: [{..., incluir}], observaciones }
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const sinDatos = !CAMPOS.some((c) => Object.keys(paciente[c] || {}).length > 0)

  async function analizar() {
    setError('')
    setMensaje('')
    setPropuesta(null)
    if (sinDatos) {
      setError('Primero registra información en los odontogramas (estado y/o tratamientos realizados) para poder compararlos.')
      return
    }
    setAnalizando(true)
    try {
      // Pendientes que ya existen (sin los completados), para no duplicarlos
      const { data: existentes } = await supabase
        .from('pending_treatments')
        .select('tratamiento, piezas_dentales')
        .eq('patient_id', paciente.id)
        .neq('estado', 'Completado')

      const { data: sesion } = await supabase.auth.getSession()
      const r = await fetch('/.netlify/functions/detectar-pendientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sesion.session?.access_token || ''}`,
        },
        body: JSON.stringify({
          edad: paciente.edad,
          odontogramas: {
            estado_adulto: paciente.odontograma_adulto || {},
            estado_nino: paciente.odontograma_nino || {},
            trat_adulto: paciente.odontograma_trat_adulto || {},
            trat_nino: paciente.odontograma_trat_nino || {},
          },
          existentes: existentes || [],
        }),
      })
      if (r.status === 404) {
        throw new Error('La detección con IA solo funciona en el sitio publicado en Netlify.')
      }
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'No se pudo analizar los odontogramas.')
      setPropuesta({
        sugerencias: j.sugerencias.map((s) => ({ ...s, incluir: true })),
        observaciones: j.observaciones || '',
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setAnalizando(false)
    }
  }

  function alternar(i) {
    setPropuesta((p) => ({
      ...p,
      sugerencias: p.sugerencias.map((s, k) => (k === i ? { ...s, incluir: !s.incluir } : s)),
    }))
  }

  async function agregar() {
    const filas = propuesta.sugerencias
      .filter((s) => s.incluir)
      .map((s) => ({
        patient_id: paciente.id,
        tratamiento: s.tratamiento,
        piezas_dentales: s.piezas.join(', '),
        estado: 'Pendiente',
        notas: `Detectado por IA: ${s.motivo}`,
      }))
    if (!filas.length) return
    setGuardando(true)
    const { error } = await supabase.from('pending_treatments').insert(filas)
    setGuardando(false)
    if (error) {
      setError('No se pudo guardar: ' + error.message)
      return
    }
    setPropuesta(null)
    setMensaje(`Se agregaron ${filas.length} tratamiento(s) pendiente(s) a la lista.`)
    onAgregado?.()
  }

  const seleccionadas = propuesta?.sugerencias.filter((s) => s.incluir).length || 0

  return (
    <div className="card p-4 mb-5 border-pine/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[14rem]">
          <h3 className="font-display font-semibold text-pine flex items-center gap-2">
            <Chispa /> Detectar pendientes con IA
          </h3>
          <p className="text-xs text-ink/60 mt-0.5">
            Compara el odontograma de estado con el de tratamientos realizados y sugiere lo que podría faltar
            (por ejemplo, prótesis en piezas ausentes u obturación en caries sin restaurar).
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={analizar} disabled={analizando}>
          {analizando ? 'Analizando…' : 'Analizar odontogramas'}
        </button>
      </div>

      {error && <p className="text-sm text-clay mt-3">{error}</p>}
      {mensaje && <p className="text-sm text-pine mt-3">{mensaje}</p>}

      {propuesta && (
        <div className="mt-4 border-t border-line pt-3">
          {propuesta.sugerencias.length === 0 ? (
            <p className="text-sm text-ink/70">
              No se detectaron tratamientos pendientes nuevos con la información registrada.
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold mb-2">Sugerencias — revisa y elige cuáles agregar:</p>
              <div className="space-y-2 mb-3">
                {propuesta.sugerencias.map((s, i) => (
                  <label
                    key={i}
                    className={`flex items-start gap-3 rounded-md border p-2.5 cursor-pointer ${
                      s.incluir ? 'border-pine bg-sage' : 'border-line opacity-60'
                    }`}
                  >
                    <input type="checkbox" className="mt-1 w-4 h-4" checked={s.incluir} onChange={() => alternar(i)} />
                    <div className="text-sm">
                      <p className="font-semibold">
                        {s.tratamiento}
                        <span className="font-normal text-ink/60"> · piezas {s.piezas.join(', ')}</span>
                      </p>
                      <p className="text-ink/70 text-xs mt-0.5">{s.motivo}</p>
                    </div>
                  </label>
                ))}
              </div>
              <button type="button" className="btn-primary" onClick={agregar} disabled={seleccionadas === 0 || guardando}>
                {guardando ? 'Guardando…' : `Agregar ${seleccionadas} a pendientes`}
              </button>
            </>
          )}
          {propuesta.observaciones && (
            <p className="text-xs text-[#A8431F] bg-clayLight rounded-md p-2 mt-3">
              Para tu criterio: {propuesta.observaciones}
            </p>
          )}
          <p className="text-xs text-ink/50 mt-3">
            Son sugerencias de apoyo basadas en lo registrado; la decisión clínica es del odontólogo.
          </p>
        </div>
      )}
    </div>
  )
}
