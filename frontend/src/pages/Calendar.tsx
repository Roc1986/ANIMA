import { useEffect, useState } from 'react'
import { api } from '../api/client'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  BellAlertIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

interface CalendarEvent {
  id: string
  title: string
  description: string
  date: string
  type: string
  color: string
  days_until: number
  is_past: boolean
  is_urgent: boolean
  is_today: boolean
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function eventBadgeClass(ev: CalendarEvent) {
  if (ev.is_past) return 'bg-gray-100 text-gray-500 border-gray-200'
  if (ev.is_today) return 'bg-red-600 text-white border-red-600'
  if (ev.is_urgent) return 'bg-amber-50 text-amber-800 border-amber-300'
  return 'bg-blue-50 text-blue-800 border-blue-200'
}

function UpcomingCard({ ev }: { ev: CalendarEvent }) {
  const dateStr = new Date(ev.date + 'T12:00:00').toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div
      className={`rounded-xl border p-4 ${eventBadgeClass(ev)}`}
      style={{ borderLeftWidth: 4, borderLeftColor: ev.color }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{ev.title}</p>
          <p className="text-xs opacity-75 mt-0.5">{ev.description}</p>
          <p className="text-xs mt-2 font-medium capitalize">{dateStr}</p>
        </div>
        <div className="text-right shrink-0">
          {ev.is_today ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold">
              <BellAlertIcon className="w-3.5 h-3.5" /> HOY
            </span>
          ) : ev.is_past ? (
            <span className="inline-flex items-center gap-1 text-xs">
              <CheckCircleIcon className="w-3.5 h-3.5" /> Pasado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold">
              <ClockIcon className="w-3.5 h-3.5" />
              {ev.days_until === 1 ? 'Mañana' : `${ev.days_until} días`}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Calendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [upcoming, setUpcoming] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get(`/api/calendar/events?year=${year}&month=${month}`),
      api.get('/api/calendar/upcoming'),
    ]).then(([evRes, upRes]) => {
      setEvents(evRes.data.events)
      setUpcoming(upRes.data)
    }).finally(() => setLoading(false))
  }, [year, month])

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  function eventsForDay(day: number) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.date === dateStr)
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const selectedEvents = selectedDate ? events.filter(e => e.date === selectedDate) : []

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calendario de Obligaciones</h1>
        <p className="text-gray-500 text-sm mt-1">
          Fechas límite legales: Previred, IVA, Mutuales y otros
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Calendar grid */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-lg font-bold text-gray-900">
              {MONTH_NAMES[month - 1]} {year}
            </h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRightIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
            ))}
          </div>

          {/* Cells */}
          {loading ? (
            <div className="h-64 flex items-center justify-center text-gray-400">Cargando...</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayEvents = eventsForDay(day)
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedDate

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`min-h-[72px] rounded-xl p-1.5 cursor-pointer transition-all border ${
                      isSelected
                        ? 'border-blue-400 bg-blue-50'
                        : isToday
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`text-sm font-semibold mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-blue-600 text-white' : 'text-gray-700'
                    }`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.map(ev => (
                        <div
                          key={ev.id}
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md truncate border ${
                            ev.is_past
                              ? 'bg-gray-100 text-gray-400 border-gray-200'
                              : ev.is_urgent
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'text-white border-transparent'
                          }`}
                          style={!ev.is_past && !ev.is_urgent ? { backgroundColor: ev.color } : {}}
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#1e3a5f]" />
              <span className="text-xs text-gray-500">Previred</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#7c3aed]" />
              <span className="text-xs text-gray-500">F29 IVA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#059669]" />
              <span className="text-xs text-gray-500">Mutual Seguridad</span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-6">
          {/* Selected day detail */}
          {selectedDate && selectedEvents.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </h3>
              <div className="space-y-3">
                {selectedEvents.map(ev => <UpcomingCard key={ev.id} ev={ev} />)}
              </div>
            </div>
          )}

          {/* Upcoming deadlines */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm flex items-center gap-2">
              <BellAlertIcon className="w-4 h-4 text-amber-500" />
              Próximos vencimientos
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-400">No hay vencimientos en los próximos 30 días.</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map(ev => <UpcomingCard key={ev.id} ev={ev} />)}
              </div>
            )}
          </div>

          {/* Email reminder notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-blue-900 mb-1">📧 Recordatorios por email</p>
            <p className="text-xs text-blue-700">
              El sistema envía automáticamente un email 4 días antes de cada vencimiento al administrador de la empresa.
            </p>
            <p className="text-xs text-blue-500 mt-2">
              Para activar, configura SMTP_USER y SMTP_PASSWORD en el servidor.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
