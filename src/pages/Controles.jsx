import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import AnalizarHistorialIA from '../components/AnalizarHistorialIA'
import {
  ETIQUETA_TIPO, calcularControl, fechaCorta, hoyISO, textoDuracion, traerTodo,
} from '../lib/controles'

const ESTILO = {
  vencido: { clase: 'bg-clayLight text-[#A8431F]', texto: 'Vencido' },
  proximo: { clase: 'bg-amber-100 text-amber-800', texto: 'Próximo' },
  al_dia: { clase: 'bg-sage text-pine', texto: 'Al día' },
  sin_registro: { clase: 'bg-gray-100 text-gray-600', texto: 'Sin registro' },
}
const PESO = { vencido: 0, sin_registro: 1, proximo: 2, al_dia: 3 }

function mensajeRecordatorio(p) {
  const frecuencia =
    p.tipo === 'ortodoncia' ? 'cada 3 meses, por su tratamiento de ortodoncia' : 'cada 6 meses'
  const base = `Hola ${p.nombre_completo}, le saludamos del consultorio dental.`
  const c = p.control
  if (c.estado === 'sin_registro') {
    return `${base} Queremos programar su limpieza dental de control, que se recomienda ${frecuencia}. ¿Le gustaría agendar su cita?`
  }
  if (c.estado === 'vencido') {
    return `${base} Ya le corresponde su limpieza dental de control (se recomienda ${frecuencia}); su última limpieza fue el ${fechaCorta(c.ultima)}. ¿Le gustaría agendar su cita?`
  }
  return `${base} Se acerca su limpieza dental de control (se recomienda ${frecuencia}); su última limpieza fue el ${fechaCorta(c.ultima)}. ¿Le gustaría agendar su cita?`
}

export default function Controles() {
  const [pacientes, setPacientes] = useState([])
  const [ultimas, setUltimas] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [registrando, setRegistrando] = useState(null) // { id, fecha }

  async function cargar() {
    setLoading(true)
    setError('')
    try {
      const [pacs, limpiezas] = await Promise.all([
        traerTodo(() =>
          supabase
            .from('patients')
            .select('id, nombre_completo, telefono, edad, tipo_control, ultimo_aviso_control')
            .order('nombre_completo')
            .order('id')
        ),
        traerTodo(() =>
          supabase.from('treatments').select('id, patient_id, fecha_atencion').eq('es_limpieza', true).order('id')
        ),
      ])
      const ultima = {}
      for (const l of limpiezas) {
        if (!ultima[l.patient_id] || l.fecha_atencion > ultima[l.patient_id]) ultima[l.patient_id] = l.fecha_atencion
      }
      setPacientes(pacs)
      setUltimas(ultima)
    } catch (e) {
      setError(
        'No se pudo cargar. ¿Ya ejecutaste la migración v3 en Supabase (supabase/migracion_v3.sql)? Detalle: ' + e.message
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const filas = useMemo(
    () =>
      pacientes
        .filter((p) => (p.tipo_control || 'general') !== 'ninguno')
        .map((p) => {
          const tipo = p.tipo_control || 'general'
          return { ...p, tipo, control: calcularControl(tipo, ultimas[p.id]) }
        })
        .sort(
          (a, b) =>
            PESO[a.control.estado] - PESO[b.control.estado] ||
            (a.control.dias ?? 0) - (b.control.dias ?? 0) ||
            a.nombre_completo.localeCompare(b.nombre_completo)
        ),
    [pacientes, ultimas]
  )

  const baseFiltrada = filas
    .filter((p) => !filtroTipo || p.tipo === filtroTipo)
    .filter((p) => !busqueda || p.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()))

  const conteo = (estado) => baseFiltrada.filter((p) => p.control.estado === estado).length
  const visibles = baseFiltrada.filter((p) => filtro === 'todos' || p.control.estado === filtro)
  const excluidos = pacientes.length - filas.length

  async function cambiarTipo(p, tipo) {
    await supabase.from('patients').update({ tipo_control: tipo }).eq('id', p.id)
    cargar()
  }

  async function marcarAvisado(p) {
    await supabase.from('patients').update({ ultimo_aviso_control: hoyISO() }).eq('id', p.id)
    cargar()
  }

  function whatsapp(p) {
    const tel = (p.telefono || '').replace(/[^0-9]/g, '')
    if (!tel) {
      alert('Este paciente no tiene número de teléfono registrado.')
      return
    }
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensajeRecordatorio(p))}`, '_blank')
  }

  async function registrarLimpieza() {
    const { error } = await supabase.from('treatments').insert([
      {
        patient_id: registrando.id,
        fecha_atencion: registrando.fecha,
        tratamiento: 'Limpieza dental',
        es_limpieza: true,
        saldo_anterior: 0,
        abono: 0,
        saldo_actual: 0,
      },
    ])
    if (error) {
      alert('No se pudo registrar: ' + error.message)
      return
    }
    setRegistrando(null)
    cargar()
  }

  const pildoras = [
    ['todos', 'Todos', baseFiltrada.length],
    ['vencido', 'Vencidos', conteo('vencido')],
    ['sin_registro', 'Sin registro', conteo('sin_registro')],
    ['proximo', 'Próximos', conteo('proximo')],
    ['al_dia', 'Al día', conteo('al_dia')],
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="font-display text-2xl text-pine mb-1">Control de limpiezas</h1>
      <p className="text-sm text-ink/60 mb-6">
        Limpieza dental cada 6 meses; cada 3 meses en pacientes de ortodoncia. Los más urgentes aparecen primero.
      </p>

      <AnalizarHistorialIA pacientes={pacientes} onTerminado={cargar} />

      {error && <p className="text-sm text-clay mb-4">{error}</p>}

      <div className="flex flex-wrap gap-2 mb-3">
        {pildoras.map(([valor, etiqueta, n]) => (
          <button
            key={valor}
            className={`${filtro === valor ? 'btn-primary' : 'btn-secondary'} text-sm`}
            onClick={() => setFiltro(valor)}
          >
            {etiqueta} ({n})
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          className="input w-auto"
          placeholder="Buscar por paciente…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select className="input w-auto" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="general">{ETIQUETA_TIPO.general}</option>
          <option value="ortodoncia">{ETIQUETA_TIPO.ortodoncia}</option>
        </select>
      </div>

      {loading ? (
        <p className="text-ink/50">Cargando…</p>
      ) : visibles.length === 0 ? (
        <p className="text-ink/50">No hay pacientes en esta vista.</p>
      ) : (
        <div className="space-y-3">
          {visibles.map((p) => {
            const c = p.control
            const est = ESTILO[c.estado]
            let detalle = 'Sin limpieza registrada'
            if (c.estado === 'vencido') detalle = `Vencida hace ${textoDuracion(c.dias)}`
            if (c.estado === 'proximo') detalle = c.dias === 0 ? 'Le toca hoy' : `En ${textoDuracion(c.dias)}`
            if (c.estado === 'al_dia') detalle = `En ${textoDuracion(c.dias)}`
            return (
              <div key={p.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                  <Link to={`/pacientes/${p.id}`} className="font-semibold text-pine hover:underline">
                    {p.nombre_completo}
                  </Link>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${est.clase}`}>{est.texto}</span>
                </div>
                <p className="text-sm text-ink/70">
                  {c.ultima ? `Última limpieza: ${fechaCorta(c.ultima)} · Próxima: ${fechaCorta(c.proxima)} · ` : ''}
                  {detalle}
                </p>
                <p className="text-xs text-ink/50 mt-0.5">
                  Tel: {p.telefono || 'sin teléfono'}
                  {p.ultimo_aviso_control ? ` · Avisado: ${fechaCorta(p.ultimo_aviso_control)}` : ''}
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button className="btn-secondary text-xs" onClick={() => whatsapp(p)}>WhatsApp</button>
                  {p.telefono && (
                    <a className="btn-secondary text-xs" href={`tel:${p.telefono.replace(/[^0-9+]/g, '')}`}>Llamar</a>
                  )}
                  <button className="btn-secondary text-xs" onClick={() => marcarAvisado(p)}>Marcar avisado hoy</button>
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => setRegistrando({ id: p.id, fecha: hoyISO() })}
                  >
                    Registrar limpieza realizada
                  </button>
                  <select
                    className="input w-auto text-xs"
                    value={p.tipo}
                    onChange={(e) => cambiarTipo(p, e.target.value)}
                    aria-label="Tipo de control"
                  >
                    <option value="general">{ETIQUETA_TIPO.general}</option>
                    <option value="ortodoncia">{ETIQUETA_TIPO.ortodoncia}</option>
                    <option value="ninguno">{ETIQUETA_TIPO.ninguno}</option>
                  </select>
                </div>

                {registrando?.id === p.id && (
                  <div className="flex flex-wrap items-end gap-2 mt-3 border-t border-line pt-3">
                    <div>
                      <label className="field-label">Fecha de la limpieza</label>
                      <input
                        type="date"
                        className="input"
                        value={registrando.fecha}
                        max={hoyISO()}
                        onChange={(e) => setRegistrando({ ...registrando, fecha: e.target.value })}
                      />
                    </div>
                    <button className="btn-primary" onClick={registrarLimpieza} disabled={!registrando.fecha}>
                      Guardar
                    </button>
                    <button className="btn-secondary" onClick={() => setRegistrando(null)}>Cancelar</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {excluidos > 0 && (
        <p className="text-xs text-ink/50 mt-6">
          {excluidos} paciente(s) marcados como "Sin control" no aparecen aquí. Puedes reactivarlos desde sus datos
          generales.
        </p>
      )}
    </div>
  )
}
