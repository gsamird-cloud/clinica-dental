import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const CAMPOS_VACIOS = {
  nombre_completo: '',
  numero_identidad: '',
  telefono: '',
  edad: '',
  sexo: '',
  direccion: '',
  antecedentes: '',
}

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nuevo, setNuevo] = useState(CAMPOS_VACIOS)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setPacientes(data)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  async function crearPaciente(e) {
    e.preventDefault()
    setError('')
    if (!nuevo.nombre_completo.trim()) {
      setError('El nombre completo es obligatorio.')
      return
    }
    setGuardando(true)
    const { error } = await supabase.from('patients').insert([{
      ...nuevo,
      edad: nuevo.edad ? parseInt(nuevo.edad, 10) : null,
    }])
    setGuardando(false)
    if (error) {
      setError('No se pudo guardar: ' + error.message)
      return
    }
    setNuevo(CAMPOS_VACIOS)
    setMostrarForm(false)
    cargar()
  }

  async function eliminarPaciente(id, nombre) {
    if (!confirm(`¿Eliminar el registro de "${nombre}"? Esta acción no se puede deshacer.`)) return
    await supabase.from('patients').delete().eq('id', id)
    cargar()
  }

  const filtrados = pacientes.filter((p) =>
    p.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.numero_identidad?.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl text-pine">Pacientes</h1>
          <p className="text-sm text-ink/60">Gestión de expedientes clínicos</p>
        </div>
        <button className="btn-primary" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? 'Cancelar' : '+ Agregar paciente'}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={crearPaciente} className="card p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="field-label">Nombre completo *</label>
            <input className="input" value={nuevo.nombre_completo}
              onChange={(e) => setNuevo({ ...nuevo, nombre_completo: e.target.value })} required />
          </div>
          <div>
            <label className="field-label">Número de identidad</label>
            <input className="input" value={nuevo.numero_identidad}
              onChange={(e) => setNuevo({ ...nuevo, numero_identidad: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Teléfono</label>
            <input className="input" value={nuevo.telefono}
              onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Edad</label>
            <input className="input" type="number" value={nuevo.edad}
              onChange={(e) => setNuevo({ ...nuevo, edad: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Sexo</label>
            <select className="input" value={nuevo.sexo}
              onChange={(e) => setNuevo({ ...nuevo, sexo: e.target.value })}>
              <option value="">Seleccionar…</option>
              <option value="Femenino">Femenino</option>
              <option value="Masculino">Masculino</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Dirección</label>
            <input className="input" value={nuevo.direccion}
              onChange={(e) => setNuevo({ ...nuevo, direccion: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Antecedentes médicos / alergias</label>
            <textarea className="input" rows={2} value={nuevo.antecedentes}
              onChange={(e) => setNuevo({ ...nuevo, antecedentes: e.target.value })} />
          </div>
          {error && <p className="text-clay text-sm md:col-span-2">{error}</p>}
          <div className="md:col-span-2">
            <button className="btn-primary" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar paciente'}
            </button>
          </div>
        </form>
      )}

      <input
        className="input mb-4 max-w-sm"
        placeholder="Buscar por nombre o número de identidad…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {loading ? (
        <p className="text-ink/50">Cargando…</p>
      ) : filtrados.length === 0 ? (
        <p className="text-ink/50">No hay pacientes registrados todavía.</p>
      ) : (
        <div className="card divide-y divide-line">
          {filtrados.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <Link to={`/pacientes/${p.id}`} className="flex-1">
                <p className="font-medium text-ink">{p.nombre_completo}</p>
                <p className="text-xs text-ink/50">
                  {p.numero_identidad || 'Sin identidad'} · {p.telefono || 'Sin teléfono'}
                </p>
              </Link>
              <div className="flex items-center gap-2">
                <Link to={`/pacientes/${p.id}`} className="btn-secondary text-sm">Ver expediente</Link>
                <button className="btn-danger text-sm" onClick={() => eliminarPaciente(p.id, p.nombre_completo)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
