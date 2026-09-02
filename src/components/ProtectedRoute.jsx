import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { session } = useAuth()

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand text-ink/60">
        Cargando…
      </div>
    )
  }

  if (session === null) {
    return <Navigate to="/login" replace />
  }

  return children
}
