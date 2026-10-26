import PendientesLista from '../components/PendientesLista'

export default function Pendientes() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="font-display text-2xl text-pine mb-1">Tratamientos pendientes</h1>
      <p className="text-sm text-ink/60 mb-6">
        Pacientes con tratamientos por realizar. Los que nunca se han contactado aparecen primero,
        seguidos de los de contacto más antiguo.
      </p>
      <PendientesLista />
    </div>
  )
}
