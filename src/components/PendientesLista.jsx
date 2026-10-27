import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const ESTADOS = ['Pendiente', 'Contactado', 'Agendado', 'Completado']

const COLOR_ESTADO = {
  Pendiente: 'bg-clayLight text-[#A8431F]',
  Contactado: 'bg-sage text-pine',
  Agendado: 'bg-sky-100 text-sky-800',
  Completado: 'bg-gray-100 text-gray-500',
}

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fechaCorta(iso) {
  if (!iso) return null
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

// Si se pasa patientId, muestra solo los pendientes de ese paciente (dentro del expediente).
// Si no, muestra el listado general de todos los pacientes.
export default function PendientesLista({ patientId = null, refreshKey = 0 }) {
  const [items, setItems] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('activos')
  const [filtroNombre, setFiltroNombre] = useState('')

  async function cargar() {
    setLoading(true)
    let q = supabase
      .from('pending_treatments')
      .select('*, patients(nombre_completo, telefono)')
      .order('created_at', { ascending: false })
    if (patientId) q = q.eq('patient_id', patientId)
    const { data } = await q
    setItems(data || [])
    setLoading(false)
  }

  async function cargarPacientes() {
    const { data } = await supabase
      .from('patients')
      .select('id, nombre_completo')
      .order('nombre_completo', { ascending: true })
    setPacientes(data || [])
  }

  useEffect(() => {
    cargar()
    if (!patientId) cargarPacientes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, refreshKey])

  function nuevo() {
    setError('')
    setForm({
      patient_id: patientId || '',
      tratamiento: '',
      piezas_dentales: '',
      estado: 'Pendiente',
      ultimo_contacto: '',
      notas: '',
    })
  }

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (!form.patient_id) {
      setError('Selecciona un paciente.')
      return
    }
    const payload = {
      patient_id: form.patient_id,
      tratamiento: form.tratamiento,
      piezas_dentales: form.piezas_dentales,
      estado: form.estado,
      ultimo_contacto: form.ultimo_contacto || null,
      notas: form.notas,
    }
    const { error } = form.id
      ? await supabase.from('pending_treatments').update(payload).eq('id', form.id)
      : await supabase.from('pending_treatments').insert([payload])
    if (error) {
      setError('No se pudo guardar: ' + error.message)
      return
    }
    setForm(null)
    cargar()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este tratamiento pendiente?')) return
    await supabase.from('pending_treatments').delete().eq('id', id)
    cargar()
  }

  async function marcarContactado(item) {
    const cambios = { ultimo_contacto: hoyISO() }
    if (item.estado === 'Pendiente') cambios.estado = 'Contactado'
    await supabase.from('pending_treatments').update(cambios).eq('id', item.id)
    cargar()
  }

  async function cambiarEstado(item, estado) {
    await supabase.from('pending_treatments').update({ estado }).eq('id', item.id)
    cargar()
  }

  function whatsapp(item) {
    const tel = (item.patients?.telefono || '').replace(/[^0-9]/g, '')
    if (!tel) {
      alert('Este paciente no tiene número de teléfono registrado.')
      return
    }
    const piezas = item.piezas_dentales ? ` (piezas ${item.piezas_dentales})` : ''
    const mensaje = `Hola ${item.patients?.nombre_completo}, le saludamos del consultorio dental. Tiene pendiente el siguiente tratamiento: ${item.tratamiento}${piezas}. ¿Le gustaría agendar su cita?`
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  // Primero los que nunca se han contactado, luego los de contacto más antiguo
  const visibles = items
    .filter((i) => {
      if (filtroEstado === 'activos') return i.estado !== 'Completado'
      if (filtroEstado === 'todos') return true
      return i.estado === filtroEstado
    })
    .filter((i) =>
      !filtroNombre || i.patients?.nombre_completo?.toLowerCase().includes(filtroNombre.toLowerCase())
    )
    .sort((a, b) => (a.ultimo_contacto || '0000').localeCompare(b.ultimo_contacto || '0000'))

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <button className="btn-primary" onClick={nuevo}>+ Agregar tratamiento pendiente</button>
        <select className="input w-auto" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="activos">Activos (sin completar)</option>
          <option value="todos">Todos</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        {!patientId && (
          <input
            className="input w-auto"
            placeholder="Buscar por paciente…"
            value={filtroNombre}
            onChange={(e) => setFiltroNombre(e.target.value)}
          />
        )}
      </div>

      {form && (
        <form onSubmit={guardar} className="card p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {!patientId && (
            <div className="md:col-span-2">
              <label className="field-label">Paciente *</label>
              <select
                className="input"
                required
                value={form.patient_id}
                onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
              >
                <option value="">Seleccionar paciente…</option>
                {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
              </select>
            </div>
          )}
          <div className="md:col-span-2">
            <label className="field-label">Tratamiento pendiente *</label>
            <input
              className="input"
              required
              value={form.tratamiento}
              onChange={(e) => setForm({ ...form, tratamiento: e.target.value })}
              placeholder="Ej: Endodoncia, corona, extracción de cordal…"
            />
          </div>
          <div>
            <label className="field-label">Piezas dentales</label>
            <input
              className="input"
              value={form.piezas_dentales || ''}
              onChange={(e) => setForm({ ...form, piezas_dentales: e.target.value })}
              placeholder="Ej: 16, 17"
            />
          </div>
          <div>
            <label className="field-label">Estado</label>
            <select className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Último contacto</label>
            <input
              className="input"
              type="date"
              value={form.ultimo_contacto || ''}
              onChange={(e) => setForm({ ...form, ultimo_contacto: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Notas</label>
            <textarea
              className="input"
              rows={2}
              value={form.notas || ''}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              placeholder="Ej: prefiere citas por la tarde, esperando aprobación de presupuesto…"
            />
          </div>
          {error && <p className="text-clay text-sm md:col-span-2">{error}</p>}
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="btn-primary">Guardar</button>
            <button type="button" className="btn-secondary" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-ink/50">Cargando…</p>
      ) : visibles.length === 0 ? (
        <p className="text-ink/50">No hay tratamientos pendientes en esta vista.</p>
      ) : (
        <div className="space-y-3">
          {visibles.map((i) => {
            const tel = i.patients?.telefono
            return (
              <div key={i.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    {!patientId && (
                      <Link to={`/pacientes/${i.patient_id}`} className="font-semibold text-pine hover:underline">
                        {i.patients?.nombre_completo || 'Paciente eliminado'}
                      </Link>
                    )}
                    <p className="font-medium">
                      {i.tratamiento}
                      {i.piezas_dentales && <span className="text-ink/50 font-normal"> · piezas {i.piezas_dentales}</span>}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${COLOR_ESTADO[i.estado]}`}>{i.estado}</span>
                </div>
                <p className="text-sm text-ink/60">
                  {!patientId && <>Tel: {tel || 'sin teléfono'} · </>}
                  {i.ultimo_contacto ? `Último contacto: ${fechaCorta(i.ultimo_contacto)}` : 'Aún sin contactar'}
                </p>
                {i.notas && <p className="text-sm text-ink/70 mt-1">{i.notas}</p>}
                <div className="flex flex-wrap gap-2 mt-3">
                  <button className="btn-secondary text-xs" onClick={() => whatsapp(i)}>WhatsApp</button>
                  {tel && (
                    <a className="btn-secondary text-xs" href={`tel:${tel.replace(/[^0-9+]/g, '')}`}>Llamar</a>
                  )}
                  <button className="btn-secondary text-xs" onClick={() => marcarContactado(i)}>Marcar contactado hoy</button>
                  {i.estado !== 'Completado' && (
                    <button className="btn-secondary text-xs" onClick={() => cambiarEstado(i, 'Completado')}>Marcar completado</button>
                  )}
                  <button className="btn-secondary text-xs" onClick={() => { setError(''); setForm(i) }}>Modificar</button>
                  <button className="btn-danger text-xs" onClick={() => eliminar(i.id)}>Eliminar</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
