import { useState } from 'react'

const CONDICIONES = [
  'Cariado',
  'Endodoncia',
  'Corona',
  'Implante',
  'Fractura',
  'Ausente',
  'Obturado',
  'Puente',
]

const CONDICION_COLOR = {
  Cariado: '#C96A4B',
  Endodoncia: '#8B5CF6',
  Corona: '#D9A441',
  Implante: '#3B82F6',
  Fractura: '#EF4444',
  Ausente: '#9CA3AF',
  Obturado: '#146B60',
  Puente: '#0EA5E9',
}

const ADULTO_SUPERIOR = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28']
const ADULTO_INFERIOR = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38']
const NINO_SUPERIOR = ['55','54','53','52','51','61','62','63','64','65']
const NINO_INFERIOR = ['85','84','83','82','81','71','72','73','74','75']

function Diente({ numero, info, onClick }) {
  const conditions = info?.conditions || []
  const color = conditions.length ? CONDICION_COLOR[conditions[0]] : null
  return (
    <button
      type="button"
      onClick={onClick}
      title={conditions.length ? conditions.join(', ') : 'Sin novedad'}
      className="flex flex-col items-center gap-1 group"
    >
      <div
        className="w-8 h-8 md:w-9 md:h-9 rounded-sm border flex items-center justify-center text-[10px] font-medium transition-colors"
        style={{
          borderColor: color || '#DDE4DE',
          background: color ? `${color}22` : '#fff',
          color: color || '#4B615C',
        }}
      >
        {numero}
      </div>
      {conditions.length > 0 && (
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      )}
    </button>
  )
}

export default function Odontograma({ tipo = 'adulto', data, onChange }) {
  const [seleccion, setSeleccion] = useState(null) // numero de diente activo
  const superior = tipo === 'adulto' ? ADULTO_SUPERIOR : NINO_SUPERIOR
  const inferior = tipo === 'adulto' ? ADULTO_INFERIOR : NINO_INFERIOR

  const dienteInfo = seleccion ? data?.[seleccion] || { conditions: [], nota: '' } : null

  function toggleCondicion(cond) {
    const actuales = dienteInfo.conditions || []
    const nuevas = actuales.includes(cond)
      ? actuales.filter((c) => c !== cond)
      : [...actuales, cond]
    onChange({ ...data, [seleccion]: { ...dienteInfo, conditions: nuevas } })
  }

  function cambiarNota(nota) {
    onChange({ ...data, [seleccion]: { ...dienteInfo, nota } })
  }

  return (
    <div>
      <div className="card p-4 overflow-x-auto">
        <div className="flex flex-col gap-3 min-w-max mx-auto items-center">
          <div className="flex gap-1">
            {superior.map((n) => (
              <Diente key={n} numero={n} info={data?.[n]} onClick={() => setSeleccion(n)} />
            ))}
          </div>
          <div className="w-full border-t border-line" />
          <div className="flex gap-1">
            {inferior.map((n) => (
              <Diente key={n} numero={n} info={data?.[n]} onClick={() => setSeleccion(n)} />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-line">
          {CONDICIONES.map((c) => (
            <div key={c} className="flex items-center gap-1.5 text-xs text-ink/70">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: CONDICION_COLOR[c] }} />
              {c}
            </div>
          ))}
        </div>
      </div>

      {seleccion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setSeleccion(null)}>
          <div className="card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg text-pine mb-3">Pieza dental {seleccion}</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {CONDICIONES.map((c) => {
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
              value={dienteInfo.nota || ''}
              onChange={(e) => cambiarNota(e.target.value)}
              placeholder="Observaciones sobre esta pieza…"
            />
            <button className="btn-primary w-full" onClick={() => setSeleccion(null)}>
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
