import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Finanzas() {
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [editando, setEditando] = useState(null)

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('treatments')
      .select('id, fecha_atencion, saldo_anterior, abono, saldo_actual, patient_id, patients(nombre_completo)')
      .order('fecha_atencion', { ascending: false })
    setRegistros(data || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const filtrados = registros.filter((r) =>
    (!desde || r.fecha_atencion >= desde) && (!hasta || r.fecha_atencion <= hasta)
  )

  const totalPagado = filtrados.reduce((sum, r) => sum + Number(r.abono || 0), 0)
  const pendientes = filtrados.filter((r) => Number(r.saldo_actual) > 0)
  const totalPendiente = pendientes.reduce((sum, r) => sum + Number(r.saldo_actual || 0), 0)

  async function guardarSaldo(id, nuevoSaldo) {
    await supabase.from('treatments').update({ saldo_actual: parseFloat(nuevoSaldo) || 0 }).eq('id', id)
    setEditando(null)
    cargar()
  }

  async function eliminarSaldo(id) {
    if (!confirm('¿Eliminar este saldo pendiente? Se marcará el saldo actual en 0.')) return
    await supabase.from('treatments').update({ saldo_actual: 0 }).eq('id', id)
    cargar()
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <h1 className="font-display text-2xl text-pine mb-1">Finanzas</h1>
      <p className="text-sm text-ink/60 mb-6">Resumen de pagos y saldos pendientes</p>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="field-label">Desde</label>
          <input type="date" className="input" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Hasta</label>
          <input type="date" className="input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        {(desde || hasta) && (
          <button className="btn-secondary text-sm" onClick={() => { setDesde(''); setHasta('') }}>Limpiar filtro</button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="card p-5">
          <p className="text-sm text-ink/50">Total pagado en el periodo</p>
          <p className="font-display text-3xl text-pine">L. {totalPagado.toFixed(2)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-ink/50">Total de saldos pendientes</p>
          <p className="font-display text-3xl text-clay">L. {totalPendiente.toFixed(2)}</p>
        </div>
      </div>

      <h2 className="font-medium text-ink mb-3">Pagos registrados</h2>
      {loading ? (
        <p className="text-ink/50">Cargando…</p>
      ) : filtrados.length === 0 ? (
        <p className="text-ink/50 mb-8">No hay pagos en el rango seleccionado.</p>
      ) : (
        <div className="card divide-y divide-line mb-8">
          {filtrados.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{r.patients?.nombre_completo || 'Paciente eliminado'}</p>
                <p className="text-ink/50">{r.fecha_atencion}</p>
              </div>
              <div className="flex gap-4">
                <span>Anterior: L. {Number(r.saldo_anterior || 0).toFixed(2)}</span>
                <span className="text-pine font-medium">Abono: L. {Number(r.abono || 0).toFixed(2)}</span>
                <span>Actual: L. {Number(r.saldo_actual || 0).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-medium text-ink mb-3">Saldos pendientes</h2>
      {pendientes.length === 0 ? (
        <p className="text-ink/50">No hay saldos pendientes.</p>
      ) : (
        <div className="card divide-y divide-line">
          {pendientes.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{r.patients?.nombre_completo || 'Paciente eliminado'}</p>
                <p className="text-ink/50">{r.fecha_atencion}</p>
              </div>
              {editando === r.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    autoFocus
                    defaultValue={r.saldo_actual}
                    className="input w-28"
                    onKeyDown={(e) => e.key === 'Enter' && guardarSaldo(r.id, e.target.value)}
                    id={`saldo-${r.id}`}
                  />
                  <button className="btn-primary text-xs" onClick={() => guardarSaldo(r.id, document.getElementById(`saldo-${r.id}`).value)}>Guardar</button>
                  <button className="btn-secondary text-xs" onClick={() => setEditando(null)}>Cancelar</button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-clay font-medium">L. {Number(r.saldo_actual).toFixed(2)}</span>
                  <button className="text-xs text-pine hover:underline" onClick={() => setEditando(r.id)}>Modificar</button>
                  <button className="text-xs text-clay hover:underline" onClick={() => eliminarSaldo(r.id)}>Eliminar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
