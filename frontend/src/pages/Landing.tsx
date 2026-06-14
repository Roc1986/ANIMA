import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/* ── Animations injected once ── */
const STYLES = `
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(-1deg); }
  50%       { transform: translateY(-14px) rotate(1deg); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(32px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: .4; }
}
.float-anim   { animation: float 5s ease-in-out infinite; }
.fade-in-up   { animation: fadeInUp .6s ease both; }
.pulse-dot    { animation: pulse-dot 2s ease-in-out infinite; }
.glass {
  background: rgba(255,255,255,.7);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.tab-fade { transition: opacity .3s ease, transform .3s ease; }
`

/* ── Scroll-reveal hook ── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

/* ── Dashboard Mockup ── */
function DashboardMockup() {
  return (
    <div className="w-full max-w-lg mx-auto select-none float-anim" style={{ perspective: '1000px' }}>
      <div style={{ transform: 'rotateY(-8deg) rotateX(4deg)', transformStyle: 'preserve-3d', borderRadius: '16px', boxShadow: '0 40px 80px rgba(0,0,0,0.35)' }}
           className="bg-white overflow-hidden border border-gray-200">
        {/* Top bar */}
        <div className="bg-[#0f2d5c] px-4 py-2 flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <span className="ml-3 text-blue-200 text-xs font-mono">animahr.cl/dashboard</span>
        </div>
        {/* App layout */}
        <div className="flex" style={{ height: '300px' }}>
          {/* Sidebar */}
          <div className="bg-[#0f2d5c] w-32 flex-shrink-0 py-3 flex flex-col gap-1 px-2">
            <div className="text-white text-xs font-bold px-2 py-1 mb-1">ANIMA HR</div>
            {['Dashboard','Empleados','Nóminas','Vacaciones','Reportes'].map((item, i) => (
              <div key={item} className={`text-xs px-2 py-1.5 rounded cursor-pointer ${i === 0 ? 'bg-white text-[#0f2d5c] font-semibold' : 'text-blue-200'}`}>{item}</div>
            ))}
          </div>
          {/* Content */}
          <div className="flex-1 bg-[#f8fafc] p-3 overflow-hidden">
            <p className="text-[10px] text-gray-500 font-semibold mb-2 uppercase tracking-wide">Resumen del mes</p>
            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[['12','Empleados','#3b82f6'],['$4.2M','Nómina','#10b981'],['98%','Cumplim.','#f97316']].map(([v,l,c]) => (
                <div key={l} className="bg-white rounded-lg p-2 shadow-sm border border-gray-100">
                  <div className="text-xs font-bold" style={{ color: c }}>{v}</div>
                  <div className="text-[9px] text-gray-400">{l}</div>
                </div>
              ))}
            </div>
            {/* Bar chart */}
            <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-100 mb-2">
              <div className="text-[9px] text-gray-400 mb-1.5">Remuneraciones por mes</div>
              <div className="flex items-end gap-1 h-10">
                {[60,75,55,80,70,90,85].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 6 ? '#f97316' : '#0f2d5c', opacity: i === 6 ? 1 : 0.5 + i*0.07 }} />
                ))}
              </div>
            </div>
            {/* Mini table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="grid grid-cols-3 text-[8px] text-gray-400 px-2 py-1 border-b border-gray-100 font-semibold">
                <span>Empleado</span><span>AFP</span><span>Líquido</span>
              </div>
              {[['J. García','Habitat','$890K'],['M. López','Provida','$1.1M']].map(([n,a,l]) => (
                <div key={n} className="grid grid-cols-3 text-[8px] text-gray-600 px-2 py-1">
                  <span>{n}</span><span>{a}</span><span className="font-semibold text-green-600">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Status bar */}
        <div className="bg-[#0f2d5c] px-4 py-1 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
          <span className="text-blue-200 text-[9px]">Sistema actualizado · Ley vigente 2026</span>
        </div>
      </div>
    </div>
  )
}

/* ── Feature tabs data ── */
const FEATURES = [
  {
    label: 'Gestión de Empleados',
    icon: '👥',
    desc: 'Ficha completa con datos personales, previsionales, laborales y bancarios. Historial, documentos y contratos en un solo lugar.',
    mockup: (
      <div className="space-y-2">
        <div className="bg-[#0f2d5c] rounded-lg p-3 text-white text-xs font-semibold">Lista de Empleados</div>
        {[['Ana Martínez','Contadora','Habitat','Activa'],['Carlos Ruiz','Vendedor','Provida','Activa'],['María Torres','Gerente','Capital','Activa']].map(([n,p,a,s]) => (
          <div key={n} className="bg-white rounded-lg p-3 border border-gray-100 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-xs font-semibold text-gray-800">{n}</div>
              <div className="text-[10px] text-gray-400">{p} · AFP {a}</div>
            </div>
            <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{s}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    label: 'Nóminas Chilenas',
    icon: '💰',
    desc: 'Cálculo automático de AFP, FONASA/ISAPRE, gratificación legal (Art. 50), impuesto único de segunda categoría y cesantía.',
    mockup: (
      <div className="space-y-2">
        <div className="bg-[#0f2d5c] rounded-lg p-3 text-white text-xs font-semibold">Liquidación Mayo 2026</div>
        {[['Sueldo Base','$800.000'],['Gratificación','$158.340'],['Desc. AFP','−$68.000'],['Desc. Salud','−$56.000'],['Imp. Único','−$12.400']].map(([k,v]) => (
          <div key={k} className="bg-white rounded-lg px-3 py-2 border border-gray-100 flex justify-between text-xs shadow-sm">
            <span className="text-gray-600">{k}</span>
            <span className={`font-semibold ${v.startsWith('−') ? 'text-red-500' : 'text-gray-800'}`}>{v}</span>
          </div>
        ))}
        <div className="bg-orange-500 rounded-lg px-3 py-2 flex justify-between text-xs text-white font-bold shadow">
          <span>Líquido a Pagar</span><span>$821.940</span>
        </div>
      </div>
    ),
  },
  {
    label: 'Previred & LRE',
    icon: '📄',
    desc: 'Genera el archivo Previred en formato estándar oficial (105 campos) y el Libro de Remuneraciones Electrónico con un solo clic.',
    mockup: (
      <div className="space-y-3">
        <div className="bg-[#0f2d5c] rounded-lg p-3 text-white text-xs font-semibold">Exportar Archivos</div>
        {[['Previred TXT','Formato oficial 105 campos','#3b82f6'],['LRE Excel','Libro Remuneraciones Electrónico','#10b981'],['Resumen PDF','Nómina consolidada del mes','#f97316']].map(([t,d,c]) => (
          <div key={t} className="bg-white rounded-lg p-3 border border-gray-100 flex items-center gap-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: c }}>↓</div>
            <div>
              <div className="text-xs font-semibold text-gray-800">{t}</div>
              <div className="text-[10px] text-gray-400">{d}</div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    label: 'Control de Vacaciones',
    icon: '🏖️',
    desc: 'Solicitudes, aprobaciones y saldo de días actualizado automáticamente según la antigüedad y la ley.',
    mockup: (
      <div className="space-y-2">
        <div className="bg-[#0f2d5c] rounded-lg p-3 text-white text-xs font-semibold">Saldos de Vacaciones</div>
        {[['Ana Martínez',15,12],['Carlos Ruiz',10,3],['María Torres',20,20]].map(([n,total,disp]) => (
          <div key={n as string} className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-gray-800">{n}</span>
              <span className="text-orange-500 font-bold">{disp} días disp.</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-[#0f2d5c] h-1.5 rounded-full" style={{ width: `${(disp as number)/(total as number)*100}%` }} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    label: 'Cartas y Finiquitos',
    icon: '⚠️',
    desc: 'Genera cartas de amonestación y finiquitos legales en PDF, listos para firmar y archivar.',
    mockup: (
      <div className="space-y-2">
        <div className="bg-[#0f2d5c] rounded-lg p-3 text-white text-xs font-semibold">Documentos Laborales</div>
        {[['Carta Amonestación','Carlos Ruiz · 10/06/2026','⚠️'],['Finiquito Voluntario','Pedro Soto · 01/06/2026','📋'],['Carta Amonestación','Luis Vera · 25/05/2026','⚠️']].map(([t,d,i]) => (
          <div key={d} className="bg-white rounded-lg p-3 border border-gray-100 flex items-center gap-3 shadow-sm">
            <span className="text-lg">{i}</span>
            <div>
              <div className="text-xs font-semibold text-gray-800">{t}</div>
              <div className="text-[10px] text-gray-400">{d}</div>
            </div>
            <span className="ml-auto text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">PDF</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    label: 'IA Legal',
    icon: '🤖',
    desc: 'Asistente con inteligencia artificial que analiza cambios en la legislación laboral chilena y propone actualizaciones de parámetros.',
    mockup: (
      <div className="space-y-2">
        <div className="bg-[#0f2d5c] rounded-lg p-3 text-white text-xs font-semibold">Asistente IA Legal</div>
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 text-xs text-blue-800">
          "¿Cuál es el IMM vigente para 2026 y cómo afecta la gratificación?"
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm text-xs text-gray-700 leading-relaxed">
          El IMM vigente es <strong>$500.000</strong>. Para gratificación legal (Art. 50), el tope mensual es <strong>$237.500</strong> (4,75 × IMM ÷ 12). El sistema ya tiene este valor actualizado. ✓
        </div>
        <div className="bg-orange-50 rounded-lg p-2 border border-orange-100 text-[10px] text-orange-700 font-semibold">
          ✓ Parámetros del sistema al día con legislación vigente
        </div>
      </div>
    ),
  },
]

/* ── Plans config ── */
function getPlans(employees: number) {
  const isEnterprise = employees > 50
  return [
    {
      name: 'Starter',
      price: 'USD $29',
      period: '/mes',
      employees: 'Hasta 10 empleados',
      features: ['Nóminas y Previred','Contratos y documentos','Control de asistencia','Vacaciones y finiquitos','Soporte por email'],
      dim: isEnterprise,
      highlight: false,
    },
    {
      name: 'Business',
      price: 'USD $59',
      period: '/mes',
      employees: 'Hasta 50 empleados',
      features: ['Todo lo de Starter','LRE automático','Cartas de amonestación','IA Legal integrada','Reportes avanzados','Soporte prioritario'],
      dim: isEnterprise,
      highlight: !isEnterprise,
    },
    {
      name: 'Enterprise',
      price: 'A convenir',
      period: '',
      employees: 'Empleados ilimitados',
      features: ['Todo lo de Business','Multi-empresa','Gestión RRHH a cargo de ANIMA HR','Onboarding personalizado','Gestor de cuenta dedicado'],
      dim: false,
      highlight: isEnterprise,
    },
  ]
}

/* ── Main component ── */
export default function Landing() {
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [activeTab, setActiveTab] = useState(0)
  const [tabVisible, setTabVisible] = useState(true)
  const [employees, setEmployees] = useState(10)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  // Navbar scroll effect
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Tab switching with fade
  const switchTab = useCallback((i: number) => {
    setTabVisible(false)
    setTimeout(() => { setActiveTab(i); setTabVisible(true) }, 200)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setLoginError(err.message || 'Credenciales incorrectas')
    } finally {
      setLoginLoading(false)
    }
  }

  const plans = getPlans(employees)
  const isEnterprise = employees > 50

  // Scroll reveal refs
  const r1 = useReveal(), r2 = useReveal(), r3 = useReveal(), r4 = useReveal(), r5 = useReveal()

  return (
    <>
      <style>{STYLES}</style>

      {/* ── LOGIN MODAL ── */}
      {showLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setShowLogin(false); setLoginError('') }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0f2d5c] flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="font-bold text-[#0f2d5c] text-lg">ANIMA HR</span>
              </div>
              <button onClick={() => { setShowLogin(false); setLoginError('') }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Bienvenido de vuelta</h2>
            <p className="text-sm text-gray-500 mb-6">Ingresa tus credenciales para acceder al portal</p>
            {loginError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">{loginError}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5c] transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5c] transition-all" />
              </div>
              <button type="submit" disabled={loginLoading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm transition-all duration-300 shadow-lg hover:shadow-orange-200">
                {loginLoading ? 'Ingresando...' : 'Ingresar al Portal'}
              </button>
            </form>
            <p className="text-center text-xs text-gray-400 mt-4">
              ¿No tienes cuenta? <a href="#contact" onClick={() => setShowLogin(false)} className="text-orange-500 hover:underline font-semibold">Contáctanos</a>
            </p>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">

        {/* ── NAVBAR ── */}
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'glass border-b border-white/40 shadow-sm' : 'bg-transparent'}`}>
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0f2d5c] flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className={`text-xl font-bold transition-colors duration-300 ${scrolled ? 'text-[#0f2d5c]' : 'text-white'}`}>ANIMA HR</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              {[['#about','Nosotros'],['#features','Funcionalidades'],['#plans','Planes'],['#contact','Contacto']].map(([href,label]) => (
                <a key={href} href={href}
                  className={`transition-all duration-200 hover:text-orange-500 ${scrolled ? 'text-slate-600' : 'text-white/90'}`}
                  onClick={e => { e.preventDefault(); document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' }) }}>
                  {label}
                </a>
              ))}
            </div>
            <button onClick={() => setShowLogin(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 shadow-md hover:shadow-orange-200 hover:-translate-y-0.5">
              Iniciar Sesión
            </button>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="min-h-screen bg-gradient-to-br from-[#0a1f40] via-[#0f2d5c] to-[#1a4080] flex items-center pt-20">
          <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div className="fade-in-up">
              <span className="inline-block bg-orange-500/20 text-orange-300 text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest border border-orange-500/30">
                Software RRHH · Chile
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
                Gestión de RRHH<br />
                <span className="text-orange-400">simple y desde</span><br />
                cualquier lugar
              </h1>
              <p className="text-blue-200 text-lg mb-10 leading-relaxed max-w-lg">
                Nóminas, Previred, contratos, vacaciones y más. Diseñado para cumplir 100% con la legislación laboral chilena.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={() => setShowLogin(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-orange-500/40 hover:-translate-y-1">
                  Acceder al Portal →
                </button>
                <a href="#plans" onClick={e => { e.preventDefault(); document.querySelector('#plans')?.scrollIntoView({ behavior: 'smooth' }) }}
                  className="border-2 border-white/30 hover:border-white/70 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 text-center hover:-translate-y-1">
                  Ver Planes
                </a>
              </div>
              {/* Trust badges */}
              <div className="flex flex-wrap gap-4 mt-10">
                {['✓ Previred oficial','✓ LRE incluido','✓ IA Legal','✓ Multi-empresa'].map(b => (
                  <span key={b} className="text-blue-300 text-xs font-medium">{b}</span>
                ))}
              </div>
            </div>
            {/* Right — floating mockup */}
            <div className="hidden md:block">
              <DashboardMockup />
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <div ref={r1.ref} className={`py-10 bg-white border-b border-gray-100 transition-all duration-700 ${r1.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[['100%','Cumplimiento legal'],['Previred','Formato oficial'],['LRE','Libro electrónico'],['IA','Asistente legal']].map(([v,l]) => (
              <div key={l}>
                <div className="text-3xl font-extrabold text-[#0f2d5c]">{v}</div>
                <div className="text-sm text-gray-500 mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── TÚ ELIGES ── */}
        <section id="about" ref={r2.ref} className={`py-20 px-6 transition-all duration-700 ${r2.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4">Tú eliges cómo trabajar</h2>
              <p className="text-gray-500 max-w-xl mx-auto">Dos caminos, un mismo resultado: cumplimiento laboral perfecto.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Card SaaS */}
              <div className="group bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-[#0f2d5c] shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer">
                <div className="text-5xl mb-5">💻</div>
                <h3 className="text-2xl font-extrabold text-[#0f2d5c] mb-3">Solo el Software</h3>
                <p className="text-gray-500 leading-relaxed mb-6">Para empresas que prefieren controlar su RRHH internamente. Accede desde cualquier lugar, gestiona tu nómina, Previred, vacaciones y más — sin instalaciones ni complicaciones.</p>
                <ul className="space-y-2">
                  {['Portal propio con tus datos','Actualizaciones legales automáticas','Soporte técnico incluido'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-[#0f2d5c] font-bold">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <span className="text-[#0f2d5c] text-sm font-bold group-hover:text-orange-500 transition-colors">Planes Starter y Business →</span>
                </div>
              </div>
              {/* Card BPO */}
              <div className="group bg-[#0f2d5c] rounded-2xl p-8 border-2 border-[#0f2d5c] hover:border-orange-400 shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer">
                <div className="text-5xl mb-5">🤝</div>
                <h3 className="text-2xl font-extrabold text-white mb-3">Software + Gestión Experta</h3>
                <p className="text-blue-200 leading-relaxed mb-6">Para empresas que prefieren delegar. Nuestro equipo se encarga de toda la gestión de RRHH por ti — nóminas, Previred, contratos y más — mientras tú te enfocas en tu negocio.</p>
                <ul className="space-y-2">
                  {['Equipo experto en RRHH Chile','Liquidaciones y Previred incluidos','Asesoría legal continua'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-blue-200">
                      <span className="text-orange-400 font-bold">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-4 border-t border-blue-800">
                  <span className="text-orange-400 text-sm font-bold group-hover:text-orange-300 transition-colors">Plan Enterprise personalizado →</span>
                </div>
              </div>
            </div>

            {/* Mission */}
            <div className="mt-12 bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <div className="text-3xl mb-3">🎯</div>
                  <h4 className="text-lg font-bold text-[#0f2d5c] mb-2">Nuestra Misión</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">Simplificar la gestión de RRHH para PYMEs que operan en Chile, permitiéndoles cumplir en tiempo y forma con la normativa laboral — ya sea directamente desde nuestro portal o delegando en nuestro equipo experto.</p>
                </div>
                <div>
                  <div className="text-3xl mb-3">🚀</div>
                  <h4 className="text-lg font-bold text-[#0f2d5c] mb-2">Nuestra Visión</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">Ser la plataforma de RRHH de referencia para empresas que operan en Chile, reconocida por su precisión legal, facilidad de uso y servicio cercano. Empresa constituida en Canadá, con foco en el mercado chileno.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES TABS ── */}
        <section id="features" ref={r3.ref} className={`py-20 px-6 bg-white transition-all duration-700 ${r3.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4">Todo lo que necesitas en un solo lugar</h2>
              <p className="text-gray-500 max-w-xl mx-auto">Una plataforma completa para el ciclo de vida laboral de tus empleados en Chile.</p>
            </div>
            <div className="grid md:grid-cols-5 gap-8 items-start">
              {/* Tab list */}
              <div className="md:col-span-2 flex flex-col gap-2">
                {FEATURES.map((f, i) => (
                  <button key={f.label} onClick={() => switchTab(i)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 font-medium text-sm ${
                      activeTab === i
                        ? 'bg-[#0f2d5c] text-white shadow-lg'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-[#0f2d5c]'
                    }`}>
                    <span className="text-xl">{f.icon}</span>
                    {f.label}
                  </button>
                ))}
              </div>
              {/* Tab content */}
              <div className="md:col-span-3 bg-[#f8fafc] rounded-2xl p-6 border border-gray-100 min-h-[380px]">
                <div className={`tab-fade ${tabVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                  <p className="text-gray-600 text-sm leading-relaxed mb-5">{FEATURES[activeTab].desc}</p>
                  {FEATURES[activeTab].mockup}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PLANS + SLIDER ── */}
        <section id="plans" ref={r4.ref} className={`py-20 px-6 bg-[#f8fafc] transition-all duration-700 ${r4.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4">Planes transparentes</h2>
              <p className="text-gray-500 mb-8">Sin letra pequeña. Cancela cuando quieras.</p>
              {/* Slider */}
              <div className="max-w-md mx-auto bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  ¿Cuántos empleados tienes? <span className="text-orange-500 text-lg font-extrabold">{employees > 50 ? '+50' : employees}</span>
                </label>
                <input type="range" min={1} max={60} value={employees} onChange={e => setEmployees(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: '#f97316' }} />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1</span><span>10</span><span>25</span><span>50</span><span>+50</span>
                </div>
                {isEnterprise && (
                  <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700 font-semibold">
                    ✦ Con más de 50 empleados te recomendamos el plan Enterprise personalizado
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 items-center">
              {plans.map((p) => (
                <div key={p.name}
                  className={`rounded-2xl p-7 flex flex-col transition-all duration-500 ${
                    p.dim ? 'opacity-30 scale-95' :
                    p.highlight ? 'bg-[#0f2d5c] text-white shadow-2xl scale-105 border-2 border-orange-400' :
                    'bg-white border border-gray-100 shadow-sm'
                  }`}>
                  {p.highlight && !p.dim && (
                    <span className="text-xs font-bold bg-orange-500 text-white px-3 py-1 rounded-full self-start mb-4">
                      {isEnterprise ? '✦ RECOMENDADO' : 'MÁS POPULAR'}
                    </span>
                  )}
                  <h3 className={`text-xl font-bold mb-1 ${p.highlight ? 'text-white' : 'text-slate-800'}`}>{p.name}</h3>
                  <div className="mb-1">
                    <span className="text-3xl font-extrabold">{p.price}</span>
                    <span className={`text-sm ${p.highlight ? 'text-blue-200' : 'text-gray-400'}`}>{p.period}</span>
                  </div>
                  <div className={`text-xs font-semibold mb-5 ${p.highlight ? 'text-orange-300' : 'text-orange-500'}`}>{p.employees}</div>
                  <ul className="space-y-2 mb-7 flex-1">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <span className={p.highlight ? 'text-orange-300' : 'text-orange-500'}>✓</span>
                        <span className={p.highlight ? 'text-blue-100' : 'text-gray-600'}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {p.name === 'Enterprise' ? (
                    <a href="mailto:admin@animahr.cl"
                      className={`text-center py-3 rounded-xl font-bold transition-all duration-300 text-sm ${
                        p.highlight
                          ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-orange-400/40'
                          : 'bg-[#0f2d5c] text-white hover:bg-[#0a1f40]'
                      }`}>
                      Contactar a un asesor →
                    </a>
                  ) : (
                    <button onClick={() => setShowLogin(true)}
                      className={`py-3 rounded-xl font-bold transition-all duration-300 text-sm ${
                        p.highlight
                          ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-orange-400/40'
                          : 'bg-[#0f2d5c] text-white hover:bg-[#0a1f40]'
                      }`}>
                      Comenzar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PAYMENT ── */}
        <div className="py-12 px-6 bg-white border-y border-gray-100 text-center">
          <p className="text-sm font-semibold text-slate-600 mb-4">Pagos seguros procesados por <span className="text-[#0f2d5c] font-bold">Stripe</span></p>
          <div className="flex flex-wrap justify-center gap-4">
            {['Visa','Mastercard','American Express','Débito internacional'].map(c => (
              <span key={c} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-xs font-medium text-gray-600">{c}</span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">Pagos en USD · ANIMA HR Inc. · Empresa constituida en Canadá</p>
        </div>

        {/* ── CONTACT ── */}
        <section id="contact" ref={r5.ref} className={`py-20 px-6 bg-gradient-to-br from-[#0a1f40] to-[#0f2d5c] text-white text-center transition-all duration-700 ${r5.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">¿Tienes preguntas?</h2>
            <p className="text-blue-200 mb-3">Escríbenos y te respondemos a la brevedad.</p>
            <p className="text-blue-300 text-sm mb-10">¿Quieres que nos encarguemos de la gestión de RRHH de tu empresa? Contáctanos para el plan Enterprise.</p>
            <a href="mailto:admin@animahr.cl"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-orange-500/40 hover:-translate-y-1">
              admin@animahr.cl
            </a>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="py-8 px-6 bg-gray-900 text-gray-400 text-center text-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded bg-[#0f2d5c] flex items-center justify-center">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="text-white font-semibold">ANIMA HR</span>
          </div>
          <p>© {new Date().getFullYear()} ANIMA HR Inc. — Empresa constituida en Canadá.</p>
          <p className="mt-1 text-xs">Software de gestión de RRHH para empresas con empleados en Chile.</p>
          <button onClick={() => setShowLogin(true)} className="mt-3 text-orange-400 hover:text-orange-300 transition-colors text-xs">
            Acceder al portal →
          </button>
        </footer>

      </div>
    </>
  )
}
