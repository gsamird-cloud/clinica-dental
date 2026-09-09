import { useEffect, useRef, useState } from 'react'
import { supabase, FILES_BUCKET } from '../lib/supabaseClient'

function esImagen(nombre) {
  return /\.(png|jpe?g)$/i.test(nombre)
}

function separarNombreExt(nombreArchivo) {
  const punto = nombreArchivo.lastIndexOf('.')
  if (punto <= 0) return { base: nombreArchivo, ext: '' }
  return { base: nombreArchivo.slice(0, punto), ext: nombreArchivo.slice(punto) }
}

export default function ArchivosPaciente({ patientId }) {
  const [archivos, setArchivos] = useState([])
  const [urlsImagenes, setUrlsImagenes] = useState({})
  const [pendientes, setPendientes] = useState([]) // archivos elegidos, aún no subidos
  const [subiendo, setSubiendo] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const [renombrando, setRenombrando] = useState(null) // nombre actual del archivo que se está renombrando
  const [valorRenombre, setValorRenombre] = useState('')
  const inputRef = useRef(null)

  async function cargarArchivos() {
    const { data } = await supabase.storage
      .from(FILES_BUCKET)
      .list(patientId, { sortBy: { column: 'created_at', order: 'desc' } })
    const lista = data || []
    setArchivos(lista)

    // Genera URLs firmadas solo para las imágenes, así se pueden mostrar como miniatura
    const imagenes = lista.filter((f) => esImagen(f.name))
    const entradas = await Promise.all(
      imagenes.map(async (f) => {
        const { data: firmada } = await supabase.storage
          .from(FILES_BUCKET)
          .createSignedUrl(`${patientId}/${f.name}`, 3600)
        return [f.name, firmada?.signedUrl]
      })
    )
    setUrlsImagenes(Object.fromEntries(entradas.filter(([, url]) => url)))
  }

  useEffect(() => {
    cargarArchivos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  function agregarPendientes(fileList) {
    const nuevos = Array.from(fileList || []).map((file) => {
      const { base, ext } = separarNombreExt(file.name)
      return {
        key: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file,
        nombre: base,
        ext,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      }
    })
    setPendientes((prev) => [...prev, ...nuevos])
  }

  function quitarPendiente(key) {
    setPendientes((prev) => {
      const objetivo = prev.find((p) => p.key === key)
      if (objetivo?.preview) URL.revokeObjectURL(objetivo.preview)
      return prev.filter((p) => p.key !== key)
    })
  }

  function cancelarTodo() {
    pendientes.forEach((p) => p.preview && URL.revokeObjectURL(p.preview))
    setPendientes([])
  }

  async function confirmarSubida() {
    if (!pendientes.length) return
    setSubiendo(true)
    for (const p of pendientes) {
      const nombreFinal = (p.nombre.trim() || separarNombreExt(p.file.name).base) + p.ext
      const path = `${patientId}/${Date.now()}_${nombreFinal}`
      await supabase.storage.from(FILES_BUCKET).upload(path, p.file)
      if (p.preview) URL.revokeObjectURL(p.preview)
    }
    setPendientes([])
    setSubiendo(false)
    cargarArchivos()
  }

  async function eliminarArchivo(nombre) {
    if (!confirm(`¿Eliminar el archivo "${nombre.replace(/^\d+_/, '')}"?`)) return
    await supabase.storage.from(FILES_BUCKET).remove([`${patientId}/${nombre}`])
    cargarArchivos()
  }

  async function verArchivo(nombre) {
    const { data } = await supabase.storage.from(FILES_BUCKET).createSignedUrl(`${patientId}/${nombre}`, 600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  function iniciarRenombre(nombreActual) {
    const { base } = separarNombreExt(nombreActual.replace(/^\d+_/, ''))
    setRenombrando(nombreActual)
    setValorRenombre(base)
  }

  async function confirmarRenombre(nombreActual) {
    const prefijo = nombreActual.match(/^\d+_/)?.[0] || ''
    const { ext } = separarNombreExt(nombreActual)
    const nombreLimpio = valorRenombre.trim()
    if (nombreLimpio) {
      const nuevoNombre = `${prefijo}${nombreLimpio}${ext}`
      if (nuevoNombre !== nombreActual) {
        await supabase.storage.from(FILES_BUCKET).move(`${patientId}/${nombreActual}`, `${patientId}/${nuevoNombre}`)
        cargarArchivos()
      }
    }
    setRenombrando(null)
  }

  function onDrop(e) {
    e.preventDefault()
    setArrastrando(false)
    agregarPendientes(e.dataTransfer.files)
  }

  return (
    <div>
      <div
        className={`card border-2 border-dashed p-6 text-center mb-4 transition-colors ${
          arrastrando ? 'border-pine bg-sage' : 'border-line'
        }`}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={onDrop}
      >
        <p className="text-sm text-ink/60 mb-2">Arrastra aquí tus archivos, o</p>
        <button type="button" className="btn-primary" onClick={() => inputRef.current?.click()}>
          + Elegir archivos
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.pdf"
          className="hidden"
          onChange={(e) => { agregarPendientes(e.target.files); e.target.value = '' }}
        />
        <p className="text-xs text-ink/40 mt-2">Formatos permitidos: PNG, JPG, PDF</p>
      </div>

      {pendientes.length > 0 && (
        <div className="card p-4 mb-6">
          <p className="text-sm font-medium text-ink mb-3">
            Archivos por subir — puedes cambiar el nombre antes de confirmar:
          </p>
          <div className="space-y-3 mb-4">
            {pendientes.map((p) => (
              <div key={p.key} className="flex items-center gap-3">
                {p.preview ? (
                  <img src={p.preview} alt="" className="w-12 h-12 object-cover rounded-md border border-line shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-md border border-line bg-sage flex items-center justify-center text-xs text-pine shrink-0">
                    PDF
                  </div>
                )}
                <input
                  className="input flex-1"
                  value={p.nombre}
                  onChange={(e) =>
                    setPendientes((prev) => prev.map((x) => (x.key === p.key ? { ...x, nombre: e.target.value } : x)))
                  }
                />
                <span className="text-xs text-ink/40 shrink-0">{p.ext}</span>
                <button type="button" className="text-xs text-clay hover:underline shrink-0" onClick={() => quitarPendiente(p.key)}>
                  Quitar
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={confirmarSubida} disabled={subiendo}>
              {subiendo ? 'Subiendo…' : `Subir ${pendientes.length} archivo(s)`}
            </button>
            <button className="btn-secondary" onClick={cancelarTodo} disabled={subiendo}>Cancelar todo</button>
          </div>
        </div>
      )}

      {archivos.length === 0 ? (
        <p className="text-ink/50">No hay archivos subidos.</p>
      ) : (
        <div className="card divide-y divide-line">
          {archivos.map((f) => {
            const nombreVisible = f.name.replace(/^\d+_/, '')
            return (
              <div key={f.name} className="flex items-center gap-3 px-4 py-3">
                {urlsImagenes[f.name] ? (
                  <img
                    src={urlsImagenes[f.name]}
                    alt=""
                    className="w-12 h-12 object-cover rounded-md border border-line cursor-pointer shrink-0"
                    onClick={() => verArchivo(f.name)}
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-md border border-line bg-sage flex items-center justify-center text-xs text-pine cursor-pointer shrink-0"
                    onClick={() => verArchivo(f.name)}
                  >
                    PDF
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {renombrando === f.name ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="input"
                        autoFocus
                        value={valorRenombre}
                        onChange={(e) => setValorRenombre(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && confirmarRenombre(f.name)}
                      />
                      <button className="btn-primary text-xs shrink-0" onClick={() => confirmarRenombre(f.name)}>Guardar</button>
                      <button className="btn-secondary text-xs shrink-0" onClick={() => setRenombrando(null)}>Cancelar</button>
                    </div>
                  ) : (
                    <button className="text-sm text-pine hover:underline text-left truncate block w-full" onClick={() => verArchivo(f.name)}>
                      {nombreVisible}
                    </button>
                  )}
                </div>
                {renombrando !== f.name && (
                  <div className="flex gap-2 shrink-0">
                    <button className="text-xs text-pine hover:underline" onClick={() => iniciarRenombre(f.name)}>Renombrar</button>
                    <button className="btn-danger text-xs" onClick={() => eliminarArchivo(f.name)}>Eliminar</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
