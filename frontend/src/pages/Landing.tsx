import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const features = [
  {
    icon: '👥',
    title: 'Gestión de Empleados',
    desc: 'Ficha completa, contratos, documentos y historial laboral en un solo lugar.',
  },
  {
    icon: '💰',
    title: 'Nóminas Chilenas',
    desc: 'Cálculo automático AFP, FONASA/ISAPRE, gratificación legal, impuesto único y Previred.',
  },
  {
    icon: '📄',
    title: 'Previred & LRE',
    desc: 'Genera el archivo Previred (formato oficial 105 campos) y el Libro de Remuneraciones Electrónico con un clic.',
  },
  {
    icon: '🏖️',
    title: 'Control de Vacaciones',
    desc: 'Solicitudes, aprobaciones y saldo de días actualizado automáticamente según la ley.',
  },
  {
    icon: '⚠️',
    title: 'Cartas y Finiquitos',
    desc: 'Genera cartas de amonestación y finiquitos legales en PDF listos para firmar.',
  },
  {
    icon: '🤖',
    title: 'IA Legal',
    desc: 'Asistente con inteligencia artificial que analiza cambios en la legislación laboral chilena y propone actualizaciones automáticas.',
  },
]

const plans = [
  {
    name: 'Starter',
    price: 'USD $29',
    period: '/mes',
    desc: 'Para empresas pequeñas que quieren digitalizar su RRHH sin complicaciones.',
    employees: 'Hasta 10 empleados',
    features: [
      'Nóminas y archivo Previred',
      'Contratos y documentos',
      'Control de asistencia',
      'Vacaciones y finiquitos',
      'Soporte por email',
    ],
    highlight: false,
  },
  {
    name: 'Business',
    price: 'USD $59',
    period: '/mes',
    desc: 'Para empresas en crecimiento con todas las funcionalidades activas.',
    employees: 'Hasta 50 empleados',
    features: [
      'Todo lo de Starter',
      'LRE automático',
      'Cartas de amonestación',
      'IA Legal integrada',
      'Reportes avanzados',
      'Soporte prioritario',
    ],
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'A convenir',
    period: '',
    desc: 'Para empresas grandes o con múltiples sucursales que necesitan gestión personalizada.',
    employees: 'Empleados ilimitados',
    features: [
      'Todo lo de Business',
      'Multi-empresa',
      'Gestión RRHH a cargo de ANIMA HR',
      'Onboarding personalizado',
      'Gestor de cuenta dedicado',
    ],
    highlight: false,
  },
]

export default function Landing() {
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Credenciales incorrectas')
      localStorage.setItem('token', data.access_token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">

      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-xl font-bold text-blue-700">ANIMA HR</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#about" className="hover:text-blue-700 transition-colors">Nosotros</a>
            <a href="#features" className="hover:text-blue-700 transition-colors">Funcionalidades</a>
            <a href="#plans" className="hover:text-blue-700 transition-colors">Planes</a>
            <a href="#contact" className="hover:text-blue-700 transition-colors">Contacto</a>
          </div>
          <button
            onClick={() => setShowLogin(true)}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Iniciar Sesión
          </button>
        </div>
      </nav>

      {/* LOGIN MODAL */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-700 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">A</span>
                </div>
                <span className="font-bold text-blue-700">ANIMA HR</span>
              </div>
              <button onClick={() => { setShowLogin(false); setError('') }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Bienvenido de vuelta</h2>
            <p className="text-sm text-gray-500 mb-6">Ingresa tus credenciales para acceder al portal</p>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors"
              >
                {loading ? 'Ingresando...' : 'Ingresar al Portal'}
              </button>
            </form>
            <p className="text-center text-xs text-gray-400 mt-4">
              ¿No tienes cuenta? <a href="#contact" onClick={() => setShowLogin(false)} className="text-blue-600 hover:underline">Contáctanos</a>
            </p>
          </div>
        </div>
      )}

      {/* HERO */}
      <section className="pt-32 pb-24 px-6 bg-gradient-to-br from-blue-700 via-blue-600 to-teal-500 text-white text-center">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">
            Software RRHH para empresas con empleados en Chile
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
            Gestión de RRHH chilena,<br />
            <span className="text-teal-200">simple y desde cualquier lugar</span>
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Nóminas, Previred, contratos, vacaciones y más. Diseñado para cumplir 100% con la legislación laboral chilena — operes desde Chile o desde el extranjero.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowLogin(true)}
              className="bg-white text-blue-700 hover:bg-blue-50 px-8 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg"
            >
              Acceder al Portal
            </button>
            <a
              href="#plans"
              className="border-2 border-white/60 hover:border-white text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors"
            >
              Ver Planes
            </a>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '100%', label: 'Cumplimiento legal Chile' },
            { value: 'Previred', label: 'Formato estándar oficial' },
            { value: 'LRE', label: 'Libro Remuneraciones Elect.' },
            { value: 'IA', label: 'Asistente legal integrado' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold text-blue-700">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT — MISSION & VISION */}
      <section id="about" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-4">Quiénes somos</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Una empresa constituida en Canadá, especializada en soluciones digitales para la gestión laboral en Chile.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-10">
            <div className="bg-blue-50 rounded-2xl p-8 border border-blue-100">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-blue-700 mb-4">Nuestra Misión</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Simplificar la gestión de recursos humanos para pequeñas y medianas empresas que operan en Chile, brindando una plataforma digital intuitiva que les permite cumplir en tiempo y forma con toda la normativa laboral y previsional vigente.
              </p>
              <p className="text-gray-600 leading-relaxed text-sm mt-4">
                Entendemos que cada empresa es distinta. Por eso ofrecemos dos caminos: quienes prefieren el control total pueden gestionar su nómina, contratos y documentos directamente desde nuestro portal — simple, claro y siempre actualizado. Y quienes prefieren delegar pueden confiarnos la gestión completa de su área de RRHH, liberándose de esa carga para enfocarse en lo que realmente importa: hacer crecer su negocio.
              </p>
            </div>
            <div className="bg-teal-50 rounded-2xl p-8 border border-teal-100">
              <div className="text-3xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-teal-700 mb-4">Nuestra Visión</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Ser la plataforma de RRHH de referencia para empresas que operan en Chile, reconocida por su precisión legal, facilidad de uso y por ofrecer un servicio cercano que se adapta a las necesidades reales de cada cliente.
              </p>
              <div className="mt-6 pt-6 border-t border-teal-200">
                <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide mb-3">Nuestros valores</p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><span className="text-teal-500">✓</span> Precisión legal y actualización permanente</li>
                  <li className="flex items-center gap-2"><span className="text-teal-500">✓</span> Simplicidad sin sacrificar potencia</li>
                  <li className="flex items-center gap-2"><span className="text-teal-500">✓</span> Servicio cercano y personalizado</li>
                  <li className="flex items-center gap-2"><span className="text-teal-500">✓</span> Confidencialidad y seguridad de datos</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-4">Todo lo que necesitas en un solo lugar</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Una plataforma completa que cubre todo el ciclo de vida laboral de tus empleados en Chile.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-lg text-gray-800 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section id="plans" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-4">Planes simples y transparentes</h2>
            <p className="text-gray-500">Sin letra pequeña. Cancela cuando quieras.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 items-center">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl p-8 flex flex-col ${
                  p.highlight
                    ? 'bg-blue-700 text-white shadow-2xl scale-105'
                    : 'bg-white border border-gray-100 text-gray-800'
                }`}
              >
                {p.highlight && (
                  <span className="text-xs font-bold bg-teal-400 text-blue-900 px-3 py-1 rounded-full self-start mb-4">
                    MÁS POPULAR
                  </span>
                )}
                <h3 className={`text-xl font-bold mb-1 ${p.highlight ? 'text-white' : 'text-gray-800'}`}>{p.name}</h3>
                <p className={`text-sm mb-4 ${p.highlight ? 'text-blue-100' : 'text-gray-500'}`}>{p.desc}</p>
                <div className="mb-2">
                  <span className="text-3xl font-extrabold">{p.price}</span>
                  <span className={`text-sm ${p.highlight ? 'text-blue-200' : 'text-gray-400'}`}>{p.period}</span>
                </div>
                <div className={`text-xs font-semibold mb-6 ${p.highlight ? 'text-teal-300' : 'text-teal-600'}`}>{p.employees}</div>
                <ul className="space-y-2 mb-8 flex-1">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm">
                      <span className={p.highlight ? 'text-teal-300' : 'text-teal-500'}>✓</span>
                      <span className={p.highlight ? 'text-blue-100' : 'text-gray-600'}>{feat}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#contact"
                  className={`text-center py-3 rounded-xl font-bold transition-colors ${
                    p.highlight
                      ? 'bg-white text-blue-700 hover:bg-blue-50'
                      : 'bg-blue-700 text-white hover:bg-blue-800'
                  }`}
                >
                  {p.name === 'Enterprise' ? 'Contáctanos' : 'Comenzar'}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PAYMENT */}
      <section className="py-16 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-extrabold text-gray-800 mb-3">Formas de pago</h2>
          <p className="text-gray-500 text-sm mb-8">Procesamos pagos de forma segura a través de Stripe. Aceptamos las principales tarjetas de crédito y débito internacionales.</p>
          <div className="flex flex-wrap justify-center gap-6">
            {['Visa', 'Mastercard', 'American Express', 'Débito internacional'].map((card) => (
              <div key={card} className="bg-white border border-gray-200 rounded-xl px-6 py-3 text-sm font-medium text-gray-600 shadow-sm">
                {card}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-6">Los pagos se procesan en USD. La empresa está constituida en Canadá — los cobros aparecerán como ANIMA HR Inc.</p>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-20 px-6 bg-blue-700 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">¿Tienes preguntas?</h2>
          <p className="text-blue-100 mb-3">Escríbenos y te respondemos a la brevedad.</p>
          <p className="text-blue-200 text-sm mb-8">También puedes contactarnos si quieres que nos encarguemos de la gestión de RRHH de tu empresa.</p>
          <a
            href="mailto:admin@animahr.cl"
            className="inline-block bg-white text-blue-700 hover:bg-blue-50 px-8 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg"
          >
            admin@animahr.cl
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 bg-gray-900 text-gray-400 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded bg-blue-700 flex items-center justify-center">
            <span className="text-white font-bold text-xs">A</span>
          </div>
          <span className="text-white font-semibold">ANIMA HR</span>
        </div>
        <p>© {new Date().getFullYear()} ANIMA HR Inc. — Empresa constituida en Canadá.</p>
        <p className="mt-1">Software de gestión de RRHH para empresas con empleados en Chile.</p>
        <button
          onClick={() => setShowLogin(true)}
          className="mt-3 text-blue-400 hover:text-blue-300 transition-colors text-xs"
        >
          Acceder al portal →
        </button>
      </footer>

    </div>
  )
}
