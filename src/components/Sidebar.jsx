import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const items = [
  { to: '/pacientes', label: 'Paciente' },
  { to: '/agenda', label: 'Agenda' },
  { to: '/finanzas', label: 'Finanzas' },
  { to: '/estadisticas', label: 'Estadísticas' },
]

export default function Sidebar() {
  const { signOut } = useAuth()

  return (
    <aside className="w-56 shrink-0 bg-pine text-sand min-h-screen flex flex-col">
      <div className="px-5 py-6 border-b border-white/10">
        <h1 className="font-display text-lg leading-tight">Consultorio<br/>Dental</h1>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive ? 'bg-white/15 text-white' : 'text-sand/75 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={signOut}
          className="w-full text-left px-3 py-2 rounded-md text-sm text-sand/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
