import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Pacientes from './pages/Pacientes'
import PacienteDetalle from './pages/PacienteDetalle'
import Agenda from './pages/Agenda'
import Finanzas from './pages/Finanzas'
import Estadisticas from './pages/Estadisticas'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/pacientes" replace />} />
        <Route
          path="/pacientes"
          element={
            <ProtectedRoute>
              <Layout><Pacientes /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pacientes/:id"
          element={
            <ProtectedRoute>
              <Layout><PacienteDetalle /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/agenda"
          element={
            <ProtectedRoute>
              <Layout><Agenda /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/finanzas"
          element={
            <ProtectedRoute>
              <Layout><Finanzas /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/estadisticas"
          element={
            <ProtectedRoute>
              <Layout><Estadisticas /></Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/pacientes" replace />} />
      </Routes>
    </AuthProvider>
  )
}
