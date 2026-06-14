import { Link } from 'react-router-dom'

const features = [
  {
    icon: '👥',
    title: 'Gestión de Empleados',
    desc: 'Ficha completa, contratos, documentos y historial laboral en un solo lugar.',
  },
  {
    icon: '💰',
    title: 'Nóminas Chilenas',
    desc: 'Cálculo automático AFP, FONASA/ISAPRE, gratificación legal, impuesto único y más.',
  },
  {
    icon: '📄',
    title: 'Previred & LRE',
    desc: 'Genera el archivo Previred (105 campos) y el Libro de Remuneraciones Electrónico con un clic.',
  },
  {
    icon: '🏖️',
    title: 'Control de Vacaciones',
    desc: 'Solicitudes, aprobaciones y saldo de días automático según la ley.',
  },
  {
    icon: '⚠️',
    title: 'Cartas y Finiquitos',
    desc: 'Genera cartas de amonestación y finiquitos legales en PDF listos para firmar.',
  },
  {
    icon: '🤖',
    title: 'IA Legal',
    desc: 'Asistente con IA que analiza cambios en la legislación laboral chilena y propone actualizaciones.',
  },
]

const plans = [
  {
    name: 'Starter',
    price: 'USD $29',
    period: '/mes',
    desc: 'Para empresas pequeñas que quieren digitalizar su RRHH.',
    employees: 'Hasta 10 empleados',
    features: ['Nóminas y Previred', 'Contratos y documentos', 'Control de asistencia', 'Soporte por email'],
    highlight: false,
  },
  {
    name: 'Business',
    price: 'USD $59',
    period: '/mes',
    desc: 'Para empresas en crecimiento con necesidades completas.',
    employees: 'Hasta 50 empleados',
    features: ['Todo lo de Starter', 'LRE automático', 'Vacaciones y finiquitos', 'Cartas de amonestación', 'IA Legal', 'Soporte prioritario'],
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'A convenir',
    period: '',
    desc: 'Para empresas grandes o con múltiples sucursales.',
    employees: 'Empleados ilimitados',
    features: ['Todo lo de Business', 'Multi-empresa', 'Onboarding personalizado', 'Gestor de cuenta dedicado'],
    highlight: false,
  },
]

export default function Landing() {
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
            <a href="#features" className="hover:text-blue-700 transition-colors">Funcionalidades</a>
            <a href="#plans" className="hover:text-blue-700 transition-colors">Planes</a>
            <a href="#contact" className="hover:text-blue-700 transition-colors">Contacto</a>
          </div>
          <Link
            to="/login"
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Iniciar Sesión
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-blue-700 via-blue-600 to-teal-500 text-white text-center">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">
            Software RRHH para empresas con empleados en Chile
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
            Gestión de RRHH chilena,<br />
            <span className="text-teal-200">simple y desde cualquier lugar</span>
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Nóminas, Previred, contratos, vacaciones y mucho más. Diseñado para cumplir 100% con la legislación laboral chilena — operes desde Chile o desde el extranjero.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="bg-white text-blue-700 hover:bg-blue-50 px-8 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg"
            >
              Acceder al Sistema
            </Link>
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

      {/* FEATURES */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-4">Todo lo que necesitas para gestionar tu equipo</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Una plataforma completa que cubre todo el ciclo de vida laboral de tus empleados en Chile.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-lg text-gray-800 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section id="plans" className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-4">Planes simples y transparentes</h2>
            <p className="text-gray-500">Sin letra pequeña. Cancela cuando quieras.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
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

      {/* CONTACT */}
      <section id="contact" className="py-20 px-6 bg-blue-700 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">¿Tienes preguntas?</h2>
          <p className="text-blue-100 mb-8">Escríbenos y te respondemos a la brevedad.</p>
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
        <p>© {new Date().getFullYear()} ANIMA HR. Software de gestión de RRHH para Chile.</p>
        <p className="mt-1">
          <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors">Acceder al sistema</Link>
        </p>
      </footer>

    </div>
  )
}
