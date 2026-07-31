import { useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'clock-timezone'

function getSavedTimezone(): string {
  return localStorage.getItem(STORAGE_KEY) || Intl.DateTimeFormat().resolvedOptions().timeZone
}

function getTimezones(): string[] {
  try {
    return (Intl as any).supportedValuesOf('timeZone')
  } catch {
    return [
      'UTC',
      'Europe/Moscow',
      'Europe/London',
      'Europe/Berlin',
      'Europe/Paris',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Kolkata',
      'Australia/Sydney',
    ]
  }
}

function formatTime(tz: string): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: tz,
  })
}

function formatUtcOffset(tz: string): string {
  const now = new Date()
  const formatted = new Intl.DateTimeFormat('en', {
    timeZone: tz,
    timeZoneName: 'shortOffset',
  }).format(now)
  const match = formatted.match(/GMT([+-]\d{1,2}(:\d{2})?)/)
  return match ? `UTC${match[1]}` : ''
}

export default function ClockWidget() {
  const [timezone, setTimezone] = useState(getSavedTimezone)
  const [time, setTime] = useState(() => formatTime(timezone))
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const tick = () => setTime(formatTime(timezone))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [timezone])

  useEffect(() => {
    if (!showPicker) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPicker])

  useEffect(() => {
    if (showPicker && searchRef.current) {
      searchRef.current.focus()
    }
  }, [showPicker])

  const handleTimezoneChange = (tz: string) => {
    setTimezone(tz)
    localStorage.setItem(STORAGE_KEY, tz)
    setShowPicker(false)
    setSearch('')
  }

  const allTimezones = getTimezones()
  const filtered = search
    ? allTimezones.filter((tz) => tz.toLowerCase().includes(search.toLowerCase()))
    : allTimezones

  const shortTz = timezone.split('/').pop()?.replace(/_/g, ' ') || timezone

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="flex items-center gap-1.5 tabular-nums cursor-pointer transition-colors"
        style={{ fontSize: 12, color: '#828B95' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#525C69' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#828B95' }}
        title={`${timezone} — сменить часовой пояс`}
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <path strokeLinecap="round" strokeWidth="2" d="M12 6v6l4 2" />
        </svg>
        <span>{time}</span>
        <span style={{ fontSize: 11, color: '#A5AEB8' }}>{shortTz}</span>
      </button>

      {showPicker && (
        <div className="absolute left-0 bottom-full mb-1 w-64 bg-white rounded-xl z-50" style={{ border: '1px solid #F0F0F0', boxShadow: '0 12px 34px rgba(10,27,51,.12)' }}>
          <div className="p-2 border-b border-gray-100">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск часового пояса"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map((tz) => {
              const offset = formatUtcOffset(tz)
              const label = tz.replace(/_/g, ' ')
              return (
                <button
                  key={tz}
                  onClick={() => handleTimezoneChange(tz)}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 flex justify-between items-center ${
                    tz === timezone ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  <span className="truncate">{label}</span>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{offset}</span>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400">Ничего не нашлось</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
