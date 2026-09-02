import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const ESTADOS = ['Programada', 'Confirmada', 'Atendida', 'Cancelada', 'No asistió']

const CITA_VACIA = {
  nombre_paciente: '',
  fecha: '',
  hora: '',
  estado: 'Programada',
  tratamiento: '',
  telefono: '',
}

export default function Agenda() {
  const [citas, setCitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroNombre, setFiltroNombre] = useState('')

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true })
    setCitas(data || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  async function guardar(e) {
    e.preventDefault()
    if (form.id) {
      const { id, created_at, ...rest } = form
      await supabase.from('appointments').update(rest).eq('id', id)
    } else {
      await supabase.from('appointments').insert([form])
    }
    setForm(null)
    cargar()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta cita?')) return
    await supabase.from('appointments').delete().eq('id', id)
    cargar()
  }

  function enviarRecordatorio(cita) {
    const telefono = (cita.telefono || '').replace(/[^0-9]/g, '')
    if (!telefono) {
      alert('Esta cita no tiene número de teléfono registrado.')
      return
    }
    const mensaje = `Hola ${cita.nombre_paciente}, es un placer saludarle el dia de hoy, el motivo de este mensaje es para recordale que tenemos programada su cita en el consultorio dental el dia ${cita.fecha} a las ${cita.hora}. Le agradeceremos si nos puede enviar un mensaje confirmando sus asistencia ¡Le esperamos!`
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  const filtradas = citas.filter((c) =>
    (!filtroFecha || c.fecha === filtroFecha) &&
    (!filtroEstado || c.estado === filtroEstado) &&
    (!filtroNombre || c.nombre_paciente?.toLowerCase().includes(filtroNombre.toLowerCase()))
  )

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl text-pine">Agenda</h1>
          <p className="text-sm text-ink/60">Citas del consultorio</p>
        </div>
        <button className="btn-primary" onClick={() => setForm(CITA_VACIA)}>+ Agregar cita</button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input type="date" className="input w-auto" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} />
        <select className="input w-auto" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <input className="input w-auto" placeholder="Buscar por nombre…" value={filtroNombre} onChange={(e) => setFiltroNombre(e.target.value)} />
      </div>

      {form && (
        <form onSubmit={guardar} className="card p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="field-label">Nombre de paciente</label>
            <input className="input" required value={form.nombre_paciente}
              onChange={(e) => setForm({ ...form, nombre_paciente: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Fecha</label>
            <input className="input" type="date" required value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Hora</label>
            <input className="input" type="time" required value={form.hora}
              onChange={(e) => setForm({ ...form, hora: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Estado de cita</label>
            <select className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Número de teléfono</label>
            <input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              placeholder="Con código de país, ej: 50499999999" />
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Tratamiento a realizar</label>
            <input className="input" value={form.tratamiento} onChange={(e) => setForm({ ...form, tratamiento: e.target.value })} />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="btn-primary">Guardar cita</button>
            <button type="button" className="btn-secondary" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-ink/50">Cargando…</p>
      ) : filtradas.length === 0 ? (
        <p className="text-ink/50">No hay citas que coincidan con el filtro.</p>
      ) : (
        <div className="space-y-3">
          {filtradas.map((c) => (
            <div key={c.id} className="card p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{c.nombre_paciente}</p>
                <p className="text-sm text-ink/60">{c.fecha} · {c.hora} · {c.estado}</p>
                {c.tratamiento && <p className="text-sm text-ink/60">{c.tratamiento}</p>}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button className="btn-secondary text-xs" onClick={() => enviarRecordatorio(c)}>
                  Enviar recordatorio por WhatsApp
                </button>
                <button className="btn-secondary text-xs" onClick={() => setForm(c)}>Modificar</button>
                <button className="btn-danger text-xs" onClick={() => eliminar(c.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
