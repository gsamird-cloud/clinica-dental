import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const SpeechRecognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

const ERRORES_VOZ = {
  'not-allowed': 'No hay permiso para usar el micrófono. Actívalo en los permisos del navegador.',
  'service-not-allowed': 'No hay permiso para usar el micrófono. Actívalo en los permisos del navegador.',
  'audio-capture': 'No se detectó ningún micrófono.',
  network: 'El reconocimiento de voz necesita conexión a internet.',
}

function Mic({ className = '' }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M19 10a7 7 0 0 1-14 0M12 17v5" />
    </svg>
  )
}

// Dictado por voz → IA → propuesta de registros que el usuario revisa antes de aplicar.
export default function DictadoOdontograma({ tipo, modo, data, onChange }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [parcial, setParcial] = useState('')
  const [escuchando, setEscuchando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [propuesta, setPropuesta] = useState(null) // { entradas: [{...,incluir}], aviso }
  const [error, setError] = useState('')

  const recRef = useRef(null)
  const quiereRef = useRef(false) // el usuario quiere seguir escuchando
  const baseRef = useRef('') // texto confirmado

  useEffect(() => () => {
    quiereRef.current = false
    recRef.current?.abort?.()
  }, [])

  function arrancar() {
    const rec = new SpeechRecognition()
    rec.lang = 'es-HN'
    rec.interimResults = true
    rec.continuous = false // más estable en celulares; se reinicia solo mientras el usuario no pare
    rec.onresult = (e) => {
      let final = ''
      let interino = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interino += t
      }
      if (final) {
        baseRef.current = `${baseRef.current} ${final}`.trim()
        setTexto(baseRef.current)
        setParcial('')
      } else {
        setParcial(interino)
      }
    }
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      quiereRef.current = false
      setError(ERRORES_VOZ[e.error] || 'El dictado se interrumpió. Intenta de nuevo.')
    }
    rec.onend = () => {
      if (quiereRef.current) {
        try { arrancar() } catch { setEscuchando(false) }
      } else {
        setEscuchando(false)
        setParcial('')
      }
    }
    recRef.current = rec
    rec.start()
  }

  function iniciar() {
    setError('')
    setPropuesta(null)
    baseRef.current = texto
    quiereRef.current = true
    setEscuchando(true)
    try { arrancar() } catch { quiereRef.current = false; setEscuchando(false) }
  }

  function detener() {
    quiereRef.current = false
    recRef.current?.stop?.()
  }

  async function interpretar() {
    setError('')
    setProcesando(true)
    try {
      const { data: sesion } = await supabase.auth.getSession()
      const r = await fetch('/.netlify/functions/dictado-odontograma', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sesion.session?.access_token || ''}`,
        },
        body: JSON.stringify({ transcripcion: texto, tipo, modo }),
      })
      if (r.status === 404) {
        throw new Error('El dictado con IA solo funciona en el sitio publicado en Netlify.')
      }
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'No se pudo interpretar el dictado.')
      setPropuesta({
        entradas: j.entradas.map((e) => ({ ...e, incluir: true })),
        aviso: j.no_entendido || '',
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setProcesando(false)
    }
  }

  function aplicar() {
    const nuevo = { ...data }
    for (const e of propuesta.entradas.filter((x) => x.incluir)) {
      const actual = nuevo[e.pieza] || { conditions: [], nota: '' }
      const condiciones = [...new Set([...(actual.conditions || []), ...e.condiciones])]
      const notas = [actual.nota, e.nota].filter(Boolean)
      nuevo[e.pieza] = { ...actual, conditions: condiciones, nota: [...new Set(notas)].join(' | ') }
    }
    onChange(nuevo)
    setPropuesta(null)
    baseRef.current = ''
    setTexto('')
  }

  function alternar(i) {
    setPropuesta((p) => ({
      ...p,
      entradas: p.entradas.map((e, k) => (k === i ? { ...e, incluir: !e.incluir } : e)),
    }))
  }

  const seleccionadas = propuesta?.entradas.filter((e) => e.incluir).length || 0

  if (!abierto) {
    return (
      <button type="button" className="btn-secondary text-sm mb-4 inline-flex items-center gap-2" onClick={() => setAbierto(true)}>
        <Mic /> Llenar por dictado de voz (IA)
      </button>
    )
  }

  return (
    <div className="card p-4 mb-4 border-pine/40">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="font-display font-semibold text-pine flex items-center gap-2">
            <Mic /> Dictado por voz
          </h3>
          <p className="text-xs text-ink/60 mt-0.5">
            Ejemplo: “pieza 16 obturación oclusal, 24 y 25 endodoncia, 36 extracción”. Revisarás lo que entienda la IA antes de guardarlo.
          </p>
        </div>
        <button type="button" className="text-sm text-ink/50 hover:text-ink px-2" onClick={() => { detener(); setAbierto(false) }}>
          Cerrar
        </button>
      </div>

      {!SpeechRecognition && (
        <p className="text-xs text-ink/70 bg-sage rounded-md p-2 mb-2">
          Este navegador no permite dictar dentro de la página. Usa el micrófono del teclado de tu celular o tablet para
          dictar en el cuadro de abajo, o prueba con Chrome o Safari.
        </p>
      )}

      <textarea
        className="input mb-1"
        rows={3}
        value={texto}
        onChange={(e) => { setTexto(e.target.value); baseRef.current = e.target.value }}
        placeholder="Aquí aparecerá lo que dictes. También puedes escribir o corregir el texto."
      />
      {parcial && <p className="text-xs text-ink/50 italic mb-2">{parcial}…</p>}

      <div className="flex flex-wrap gap-2 mt-2">
        {SpeechRecognition && (
          escuchando ? (
            <button type="button" className="btn-danger inline-flex items-center gap-2" onClick={detener}>
              <span className="w-2.5 h-2.5 rounded-full bg-clay animate-pulse" /> Detener
            </button>
          ) : (
            <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={iniciar}>
              <Mic /> {texto ? 'Seguir dictando' : 'Empezar a dictar'}
            </button>
          )
        )}
        <button type="button" className="btn-secondary" onClick={interpretar} disabled={!texto.trim() || procesando || escuchando}>
          {procesando ? 'Interpretando…' : 'Interpretar con IA'}
        </button>
        {texto && !escuchando && (
          <button type="button" className="text-sm text-ink/50 hover:text-ink px-2" onClick={() => { setTexto(''); baseRef.current = ''; setPropuesta(null) }}>
            Borrar texto
          </button>
        )}
      </div>

      {error && <p className="text-sm text-clay mt-3">{error}</p>}

      {propuesta && (
        <div className="mt-4 border-t border-line pt-3">
          {propuesta.entradas.length === 0 ? (
            <p className="text-sm text-ink/70">La IA no encontró piezas ni condiciones en el dictado. Intenta ser más específico, por ejemplo: “pieza 16 obturación”.</p>
          ) : (
            <>
              <p className="text-sm font-semibold mb-2">Esto entendió la IA — revisa y confirma:</p>
              <div className="space-y-2 mb-3">
                {propuesta.entradas.map((e, i) => (
                  <label key={i} className={`flex items-start gap-3 rounded-md border p-2.5 cursor-pointer ${e.incluir ? 'border-pine bg-sage' : 'border-line opacity-60'}`}>
                    <input type="checkbox" className="mt-1 w-4 h-4" checked={e.incluir} onChange={() => alternar(i)} />
                    <div className="text-sm">
                      <p className="font-semibold">Pieza {e.pieza}</p>
                      <p>{e.condiciones.length ? e.condiciones.join(', ') : <span className="text-ink/50">(solo nota)</span>}</p>
                      {e.nota && <p className="text-ink/60 text-xs mt-0.5">Nota: {e.nota}</p>}
                    </div>
                  </label>
                ))}
              </div>
              <button type="button" className="btn-primary" onClick={aplicar} disabled={seleccionadas === 0}>
                Aplicar {seleccionadas} al odontograma
              </button>
            </>
          )}
          {propuesta.aviso && (
            <p className="text-xs text-[#A8431F] bg-clayLight rounded-md p-2 mt-3">No se pudo interpretar: {propuesta.aviso}</p>
          )}
        </div>
      )}
    </div>
  )
}
