import { NavLink } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'
import { navItems } from './navItems'

// Pantallas grandes (laptop / tablet horizontal): menú lateral.
// Celular y tablet vertical: barra superior + navegación inferior.
export default function Layout({ children }) {
  const { signOut } = useAuth()

  return (
    <div className="lg:flex min-h-screen bg-sand">
      <Sidebar />

      <header
        className="lg:hidden sticky top-0 z-30 bg-pine text-sand flex items-center justify-between px-4 pb-2.5"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.6rem)' }}
      >
        <span className="font-display font-semibold text-lg">Consultorio Dental</span>
        <button onClick={signOut} className="text-sm text-sand/85 px-3 py-1.5 rounded-md hover:bg-white/10">
          Salir
        </button>
      </header>

      <main className="flex-1 min-w-0 pb-24 lg:pb-0">{children}</main>

      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-line grid grid-cols-5"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] sm:text-xs font-semibold ${
                isActive ? 'text-pine' : 'text-ink/50'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
