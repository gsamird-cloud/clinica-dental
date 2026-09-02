import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase, FILES_BUCKET } from '../lib/supabaseClient'
import Odontograma from '../components/Odontograma'

const TRATAMIENTO_VACIO = {
  fecha_atencion: '',
  piezas_dentales: '',
  diagnostico: '',
  tratamiento: '',
  notas: '',
  saldo_anterior: '',
  abono: '',
  saldo_actual: '',
}

export default function PacienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('datos')
  const [paciente, setPaciente] = useState(null)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState(null)
  const [tipoOdontograma, setTipoOdontograma] = useState('adulto')
  const [archivos, setArchivos] = useState([])
  const [subiendo, setSubiendo] = useState(false)
  const [tratamientos, setTratamientos] = useState([])
  const [tratForm, setTratForm] = useState(null) // null = oculto, objeto = editando/creando

  async function cargarPaciente() {
    const { data } = await supabase.from('patients').select('*').eq('id', id).single()
    setPaciente(data)
    setForm(data)
  }

  async function cargarArchivos() {
    const { data } = await supabase.storage.from(FILES_BUCKET).list(id, { sortBy: { column: 'created_at', order: 'desc' } })
    setArchivos(data || [])
  }

  async function cargarTratamientos() {
    const { data } = await supabase
      .from('treatments')
      .select('*')
      .eq('patient_id', id)
      .order('fecha_atencion', { ascending: false })
    setTratamientos(data || [])
  }

  useEffect(() => {
    cargarPaciente()
    cargarArchivos()
    cargarTratamientos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function guardarDatos(e) {
    e.preventDefault()
    const { edad, ...rest } = form
    await supabase.from('patients').update({ ...rest, edad: edad ? parseInt(edad, 10) : null }).eq('id', id)
    setEditando(false)
    cargarPaciente()
  }

  async function guardarOdontograma(campo, data) {
    await supabase.from('patients').update({ [campo]: data }).eq('id', id)
    setPaciente((p) => ({ ...p, [campo]: data }))
  }

  async function subirArchivos(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setSubiendo(true)
    for (const file of files) {
      const path = `${id}/${Date.now()}_${file.name}`
      await supabase.storage.from(FILES_BUCKET).upload(path, file)
    }
    setSubiendo(false)
    cargarArchivos()
    e.target.value = ''
  }

  async function eliminarArchivo(nombre) {
    if (!confirm(`¿Eliminar el archivo "${nombre}"?`)) return
    await supabase.storage.from(FILES_BUCKET).remove([`${id}/${nombre}`])
    cargarArchivos()
  }

  async function verArchivo(nombre) {
    const { data } = await supabase.storage.from(FILES_BUCKET).createSignedUrl(`${id}/${nombre}`, 60 * 10)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function guardarTratamiento(e) {
    e.preventDefault()
    const payload = {
      ...tratForm,
      patient_id: id,
      saldo_anterior: tratForm.saldo_anterior ? parseFloat(tratForm.saldo_anterior) : 0,
      abono: tratForm.abono ? parseFloat(tratForm.abono) : 0,
      saldo_actual: tratForm.saldo_actual ? parseFloat(tratForm.saldo_actual) : 0,
    }
    if (tratForm.id) {
      const { id: tid, created_at, ...rest } = payload
      await supabase.from('treatments').update(rest).eq('id', tid)
    } else {
      await supabase.from('treatments').insert([payload])
    }
    setTratForm(null)
    cargarTratamientos()
  }

  async function eliminarTratamiento(tid) {
    if (!confirm('¿Eliminar este registro de tratamiento/cita?')) return
    await supabase.from('treatments').delete().eq('id', tid)
    cargarTratamientos()
  }

  if (!paciente) return <div className="p-8 text-ink/50">Cargando expediente…</div>

  const tabs = [
    { id: 'datos', label: 'Datos generales' },
    { id: 'archivos', label: 'Archivos' },
    { id: 'odontograma', label: 'Odontograma' },
    { id: 'historia', label: 'Historia clínica' },
  ]

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <Link to="/pacientes" className="text-sm text-pine hover:underline">← Volver a pacientes</Link>
      <h1 className="font-display text-2xl text-pine mt-2 mb-1">{paciente.nombre_completo}</h1>
      <p className="text-sm text-ink/60 mb-6">{paciente.numero_identidad || 'Sin número de identidad'}</p>

      <div className="flex gap-1 mb-6 border-b border-line overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id ? 'border-pine text-pine' : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'datos' && (
        <div className="card p-5">
          {!editando ? (
            <div>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                <div><dt className="text-ink/50">Teléfono</dt><dd>{paciente.telefono || '—'}</dd></div>
                <div><dt className="text-ink/50">Edad</dt><dd>{paciente.edad || '—'}</dd></div>
                <div><dt className="text-ink/50">Sexo</dt><dd>{paciente.sexo || '—'}</dd></div>
                <div><dt className="text-ink/50">Dirección</dt><dd>{paciente.direccion || '—'}</dd></div>
                <div className="md:col-span-2"><dt className="text-ink/50">Antecedentes médicos / alergias</dt><dd>{paciente.antecedentes || '—'}</dd></div>
              </dl>
              <button className="btn-secondary" onClick={() => setEditando(true)}>Modificar datos</button>
            </div>
          ) : (
            <form onSubmit={guardarDatos} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="field-label">Nombre completo</label>
                <input className="input" value={form.nombre_completo || ''} onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Número de identidad</label>
                <input className="input" value={form.numero_identidad || ''} onChange={(e) => setForm({ ...form, numero_identidad: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Teléfono</label>
                <input className="input" value={form.telefono || ''} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Edad</label>
                <input className="input" type="number" value={form.edad || ''} onChange={(e) => setForm({ ...form, edad: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Sexo</label>
                <select className="input" value={form.sexo || ''} onChange={(e) => setForm({ ...form, sexo: e.target.value })}>
                  <option value="">Seleccionar…</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="field-label">Dirección</label>
                <input className="input" value={form.direccion || ''} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="field-label">Antecedentes médicos / alergias</label>
                <textarea className="input" rows={3} value={form.antecedentes || ''} onChange={(e) => setForm({ ...form, antecedentes: e.target.value })} />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <button type="submit" className="btn-primary">Guardar cambios</button>
                <button type="button" className="btn-secondary" onClick={() => { setForm(paciente); setEditando(false) }}>Cancelar</button>
              </div>
            </form>
          )}
        </div>
      )}

      {tab === 'archivos' && (
        <div>
          <label className="btn-primary inline-block cursor-pointer mb-4">
            {subiendo ? 'Subiendo…' : '+ Subir archivos'}
            <input type="file" multiple accept=".png,.jpg,.jpeg,.pdf" className="hidden" onChange={subirArchivos} disabled={subiendo} />
          </label>
          {archivos.length === 0 ? (
            <p className="text-ink/50">No hay archivos subidos.</p>
          ) : (
            <div className="card divide-y divide-line">
              {archivos.map((f) => (
                <div key={f.name} className="flex items-center justify-between px-4 py-3">
                  <button className="text-sm text-pine hover:underline text-left" onClick={() => verArchivo(f.name)}>
                    {f.name.replace(/^\d+_/, '')}
                  </button>
                  <button className="btn-danger text-xs" onClick={() => eliminarArchivo(f.name)}>Eliminar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'odontograma' && (
        <div>
          <div className="flex gap-2 mb-4">
            <button
              className={tipoOdontograma === 'adulto' ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
              onClick={() => setTipoOdontograma('adulto')}
            >
              Adulto
            </button>
            <button
              className={tipoOdontograma === 'nino' ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
              onClick={() => setTipoOdontograma('nino')}
            >
              Niño
            </button>
          </div>
          {tipoOdontograma === 'adulto' ? (
            <Odontograma
              tipo="adulto"
              data={paciente.odontograma_adulto || {}}
              onChange={(d) => guardarOdontograma('odontograma_adulto', d)}
            />
          ) : (
            <Odontograma
              tipo="nino"
              data={paciente.odontograma_nino || {}}
              onChange={(d) => guardarOdontograma('odontograma_nino', d)}
            />
          )}
        </div>
      )}

      {tab === 'historia' && (
        <div>
          <button className="btn-primary mb-4" onClick={() => setTratForm(TRATAMIENTO_VACIO)}>
            + Agregar tratamiento / cita
          </button>

          {tratForm && (
            <form onSubmit={guardarTratamiento} className="card p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Fecha de atención</label>
                <input className="input" type="date" required value={tratForm.fecha_atencion || ''}
                  onChange={(e) => setTratForm({ ...tratForm, fecha_atencion: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Piezas dentales tratadas</label>
                <input className="input" value={tratForm.piezas_dentales || ''}
                  onChange={(e) => setTratForm({ ...tratForm, piezas_dentales: e.target.value })} placeholder="Ej: 16, 17" />
              </div>
              <div className="md:col-span-2">
                <label className="field-label">Diagnóstico</label>
                <textarea className="input" rows={2} value={tratForm.diagnostico || ''}
                  onChange={(e) => setTratForm({ ...tratForm, diagnostico: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="field-label">Tratamiento</label>
                <textarea className="input" rows={2} value={tratForm.tratamiento || ''}
                  onChange={(e) => setTratForm({ ...tratForm, tratamiento: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="field-label">Notas</label>
                <textarea className="input" rows={2} value={tratForm.notas || ''}
                  onChange={(e) => setTratForm({ ...tratForm, notas: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Saldo anterior</label>
                <input className="input" type="number" step="0.01" value={tratForm.saldo_anterior}
                  onChange={(e) => setTratForm({ ...tratForm, saldo_anterior: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Abono</label>
                <input className="input" type="number" step="0.01" value={tratForm.abono}
                  onChange={(e) => setTratForm({ ...tratForm, abono: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Saldo actual</label>
                <input className="input" type="number" step="0.01" value={tratForm.saldo_actual}
                  onChange={(e) => setTratForm({ ...tratForm, saldo_actual: e.target.value })} />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <button type="submit" className="btn-primary">Guardar</button>
                <button type="button" className="btn-secondary" onClick={() => setTratForm(null)}>Cancelar</button>
              </div>
            </form>
          )}

          {tratamientos.length === 0 ? (
            <p className="text-ink/50">Sin historial de tratamientos.</p>
          ) : (
            <div className="space-y-3">
              {tratamientos.map((t) => (
                <div key={t.id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-pine">{t.fecha_atencion}</p>
                    <div className="flex gap-2">
                      <button className="text-xs text-pine hover:underline" onClick={() => setTratForm(t)}>Modificar</button>
                      <button className="text-xs text-clay hover:underline" onClick={() => eliminarTratamiento(t.id)}>Eliminar</button>
                    </div>
                  </div>
                  <p className="text-sm"><span className="text-ink/50">Piezas:</span> {t.piezas_dentales || '—'}</p>
                  <p className="text-sm"><span className="text-ink/50">Diagnóstico:</span> {t.diagnostico || '—'}</p>
                  <p className="text-sm"><span className="text-ink/50">Tratamiento:</span> {t.tratamiento || '—'}</p>
                  {t.notas && <p className="text-sm"><span className="text-ink/50">Notas:</span> {t.notas}</p>}
                  <div className="flex gap-4 mt-2 text-sm">
                    <span>Saldo anterior: <strong>L. {Number(t.saldo_anterior || 0).toFixed(2)}</strong></span>
                    <span>Abono: <strong>L. {Number(t.abono || 0).toFixed(2)}</strong></span>
                    <span>Saldo actual: <strong>L. {Number(t.saldo_actual || 0).toFixed(2)}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
