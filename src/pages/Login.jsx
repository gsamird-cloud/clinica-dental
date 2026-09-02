import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError('Usuario o contraseña incorrectos.')
      return
    }
    navigate('/pacientes')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-pine">Consultorio Dental</h1>
          <p className="text-sm text-ink/60 mt-1">Sistema de gestión de pacientes</p>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="field-label">Usuario (correo)</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@clinica.com"
            />
          </div>
          <div>
            <label className="field-label">Contraseña</label>
            <input
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-clay text-sm">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
        <p className="text-xs text-ink/50 text-center mt-4">
          Los usuarios se crean manualmente desde el panel de Supabase.
        </p>
      </div>
    </div>
  )
}
