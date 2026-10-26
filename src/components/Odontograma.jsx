import { useState } from 'react'

// Odontograma 1: estado / diagnóstico de cada pieza
export const CONDICIONES_ESTADO = [
  'Cariado',
  'Endodoncia',
  'Corona',
  'Implante',
  'Fractura',
  'Ausente',
  'Obturado',
  'Puente',
]

export const COLORES_ESTADO = {
  Cariado: '#E8734A',
  Endodoncia: '#8B5CF6',
  Corona: '#D9A441',
  Implante: '#3B82F6',
  Fractura: '#EF4444',
  Ausente: '#9CA3AF',
  Obturado: '#0E8388',
  Puente: '#0EA5E9',
}

// Odontograma 2: tratamientos realizados en cada pieza
export const CONDICIONES_TRATAMIENTO = [
  'Obturación',
  'Endodoncia',
  'Prótesis',
  'Corona',
  'Puente fijo',
  'Extracción',
  'Poste',
  'Carilla',
  'Implante',
  'Sellante',
  'Limpieza',
]

export const COLORES_TRATAMIENTO = {
  Obturación: '#0E8388',
  Endodoncia: '#8B5CF6',
  Prótesis: '#B45309',
  Corona: '#D9A441',
  'Puente fijo': '#0EA5E9',
  Extracción: '#6B7280',
  Poste: '#A16207',
  Carilla: '#EC4899',
  Implante: '#3B82F6',
  Sellante: '#65A30D',
  Limpieza: '#22C55E',
}

const ADULTO_SUPERIOR = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28']
const ADULTO_INFERIOR = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38']
const NINO_SUPERIOR = ['55','54','53','52','51','61','62','63','64','65']
const NINO_INFERIOR = ['85','84','83','82','81','71','72','73','74','75']

function Diente({ numero, info, colores, onClick }) {
  const conditions = info?.conditions || []
  const color = conditions.length ? colores[conditions[0]] || '#0E8388' : null
  return (
    <button
      type="button"
      onClick={onClick}
      title={conditions.length ? conditions.join(', ') : 'Sin novedad'}
      className="flex flex-col items-center gap-1 group"
    >
      <div
        className="w-[clamp(26px,8.5vw,38px)] h-[clamp(26px,8.5vw,38px)] rounded-sm border flex items-center justify-center text-[10px] sm:text-[11px] font-medium transition-colors"
        style={{
          borderColor: color || '#D8E8E7',
          background: color ? `${color}22` : '#fff',
          color: color || '#4E6E6C',
        }}
      >
        {numero}
      </div>
      {conditions.length > 0 && (
        <div className="flex gap-0.5">
          {conditions.slice(0, 3).map((c) => (
            <div key={c} className="w-1.5 h-1.5 rounded-full" style={{ background: colores[c] || '#0E8388' }} />
          ))}
        </div>
      )}
    </button>
  )
}

// Una arcada se muestra en dos mitades (derecha / izquierda del paciente).
// En pantallas angostas las mitades quedan una debajo de la otra.
function Arcada({ dientes, data, colores, onSelect }) {
  const mitad = dientes.length / 2
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-3">
      {[dientes.slice(0, mitad), dientes.slice(mitad)].map((grupo, i) => (
        <div key={i} className="flex gap-1">
          {grupo.map((n) => (
            <Diente key={n} numero={n} info={data?.[n]} colores={colores} onClick={() => onSelect(n)} />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function Odontograma({
  tipo = 'adulto',
  data,
  onChange,
  opciones = CONDICIONES_ESTADO,
  colores = COLORES_ESTADO,
}) {
  const [seleccion, setSeleccion] = useState(null) // numero de diente activo
  const [notaLocal, setNotaLocal] = useState('') // buffer local mientras se escribe, evita guardar en cada tecla
  const superior = tipo === 'adulto' ? ADULTO_SUPERIOR : NINO_SUPERIOR
  const inferior = tipo === 'adulto' ? ADULTO_INFERIOR : NINO_INFERIOR

  const dienteInfo = seleccion ? data?.[seleccion] || { conditions: [], nota: '' } : null

  function abrirDiente(numero) {
    setSeleccion(numero)
    setNotaLocal((data?.[numero] || {}).nota || '')
  }

  function toggleCondicion(cond) {
    const actuales = dienteInfo.conditions || []
    const nuevas = actuales.includes(cond)
      ? actuales.filter((c) => c !== cond)
      : [...actuales, cond]
    onChange({ ...data, [seleccion]: { ...dienteInfo, conditions: nuevas } })
  }

  // Solo escribe en la base de datos cuando el usuario sale del campo (o cierra el modal),
  // no en cada tecla presionada — así se evita la demora al escribir.
  function guardarNota() {
    if (notaLocal === (dienteInfo?.nota || '')) return
    onChange({ ...data, [seleccion]: { ...dienteInfo, nota: notaLocal } })
  }

  function cerrar() {
    guardarNota()
    setSeleccion(null)
  }

  return (
    <div>
      <div className="card p-3 sm:p-4 overflow-x-auto">
        <div className="flex flex-col gap-4 items-center">
          <Arcada dientes={superior} data={data} colores={colores} onSelect={abrirDiente} />
          <div className="w-full border-t border-line" />
          <Arcada dientes={inferior} data={data} colores={colores} onSelect={abrirDiente} />
        </div>
        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-line">
          {opciones.map((c) => (
            <div key={c} className="flex items-center gap-1.5 text-xs text-ink/70">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: colores[c] }} />
              {c}
            </div>
          ))}
        </div>
      </div>

      {seleccion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={cerrar}>
          <div className="card w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg text-pine mb-3">Pieza dental {seleccion}</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {opciones.map((c) => {
                const activo = (dienteInfo.conditions || []).includes(c)
                return (
                  <label
                    key={c}
                    className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded-md border cursor-pointer ${
                      activo ? 'border-pine bg-sage' : 'border-line'
                    }`}
                  >
                    <input type="checkbox" checked={activo} onChange={() => toggleCondicion(c)} />
                    {c}
                  </label>
                )
              })}
            </div>
            <label className="field-label">Nota</label>
            <textarea
              className="input mb-4"
              rows={3}
              value={notaLocal}
              onChange={(e) => setNotaLocal(e.target.value)}
              onBlur={guardarNota}
              placeholder="Observaciones sobre esta pieza…"
            />
            <button className="btn-primary w-full" onClick={cerrar}>
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
