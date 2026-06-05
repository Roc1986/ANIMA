import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../api/client'

interface LoginForm {
  email: string
  password: string
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error.response?.data?.detail || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  const handleSeedAdmin = async () => {
    setSeeding(true)
    try {
      await authApi.seedAdmin()
      toast.success('Admin creado: admin@animahr.cl / Admin1234!')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error.response?.data?.detail || 'Error al crear admin')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-anima-blue to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-anima-blue font-bold text-3xl">A</span>
          </div>
          <h1 className="text-3xl font-bold text-white">ANIMA HR</h1>
          <p className="text-blue-200 mt-1 text-sm">Sistema de RRHH y Nóminas Chile</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Iniciar Sesión</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <input
                type="email"
                className="input"
                placeholder="admin@empresa.cl"
                {...register('email', { required: 'Email requerido' })}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                {...register('password', { required: 'Contraseña requerida' })}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 text-base"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Ingresando...
                </span>
              ) : 'Ingresar'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center mb-3">
              ¿Primera vez? Crea el usuario administrador
            </p>
            <button
              onClick={handleSeedAdmin}
              disabled={seeding}
              className="btn-secondary w-full justify-center text-xs"
            >
              {seeding ? 'Creando...' : 'Crear Admin por Defecto'}
            </button>
          </div>
        </div>

        <p className="text-center text-blue-200 text-xs mt-6">
          © 2024 ANIMA HR · Conforme con legislación laboral chilena vigente
        </p>
      </div>
    </div>
  )
}
