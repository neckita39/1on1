import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { employeesApi, meetingsApi, scrumApi, authApi, BitrixUserPreview, Employee, GlobalMeeting, ScrumNote } from '../api/client'
import { useAuth } from '../App'
import { Avatar, SkeletonScreen, urgency, plural } from '../ui'
import ClockWidget from '../components/ClockWidget'
import { DailyProvider, DailyWidget } from '../components/DailyWidget'

interface ShellData {
  employees: Employee[]
  meetings: GlobalMeeting[]
  scrumNotes: ScrumNote[]
  loaded: boolean
  reload: () => Promise<void>
}

const ShellContext = createContext<ShellData>({
  employees: [],
  meetings: [],
  scrumNotes: [],
  loaded: false,
  reload: async () => {},
})

export const useShell = () => useContext(ShellContext)

// «Ближайшая встреча» и пункт «Встреча»: сначала по календарю Б24, иначе — самый просроченный
export function mostDue(employees: Employee[]): Employee | null {
  if (employees.length === 0) return null
  const scheduled = employees.filter(e => e.nextMeetingAt)
  if (scheduled.length > 0) {
    return [...scheduled].sort((a, b) => (a.nextMeetingAt! < b.nextMeetingAt! ? -1 : 1))[0]
  }
  return [...employees].sort(
    (a, b) => urgency(a.lastMeetingDate, a.nextMeetingAt).due - urgency(b.lastMeetingDate, b.nextMeetingAt).due
  )[0]
}

function NavItem({ label, badge, active, onClick }: {
  label: string
  badge?: string | number
  active: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center cursor-pointer transition-colors"
      style={{
        gap: 11,
        height: 38,
        padding: '0 10px',
        borderRadius: 10,
        fontSize: 14,
        background: active ? '#EAF3FF' : 'transparent',
        color: active ? '#0154C8' : '#525C69',
        fontWeight: active ? 500 : 400,
        transitionDuration: '.16s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F2F7FC' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <span
        className="rounded-full flex-none"
        style={{
          width: 6,
          height: 6,
          background: active ? '#0075FF' : '#D5DDE5',
          transform: active ? 'scale(1.35)' : 'scale(1)',
          transition: 'transform .25s cubic-bezier(.22,1,.36,1), background .2s',
        }}
      />
      <span>{label}</span>
      {badge !== undefined && (
        <span
          className="ml-auto rounded-pill"
          style={{
            fontSize: 11,
            padding: '2px 7px',
            background: active ? '#DCEBFF' : '#F4F7FA',
            color: active ? '#0154C8' : '#A5AEB8',
          }}
        >
          {badge}
        </span>
      )}
    </div>
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [meetings, setMeetings] = useState<GlobalMeeting[]>([])
  const [scrumNotes, setScrumNotes] = useState<ScrumNote[]>([])
  const [owner, setOwner] = useState<BitrixUserPreview | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [screenLoading, setScreenLoading] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const firstRender = useRef(true)

  const reload = async () => {
    try {
      const [emp, meet, scrum] = await Promise.all([
        employeesApi.list(),
        meetingsApi.listAll(),
        scrumApi.list(),
      ])
      setEmployees(emp.data)
      setMeetings(meet.data)
      setScrumNotes(scrum.data)
      setLoaded(true)
    } catch (e) {
      console.error('Failed to load shell data', e)
    }
  }

  useEffect(() => {
    reload()
    employeesApi.bitrixMe().then(res => setOwner(res.data)).catch(() => {})
  }, [])

  // 480 мс скелетон при каждом переходе между экранами
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
    }
    setScreenLoading(true)
    const t = setTimeout(() => setScreenLoading(false), 480)
    return () => clearTimeout(t)
  }, [location.pathname])

  const next = useMemo(() => mostDue(employees), [employees])

  const path = location.pathname
  const isTeam = path === '/' || path.startsWith('/employees')

  const handleLogout = async () => {
    await authApi.logout()
    await refresh()
    navigate('/login')
  }

  const shell: ShellData = { employees, meetings, scrumNotes, loaded, reload }

  return (
    <ShellContext.Provider value={shell}>
      <DailyProvider>
      <div className="min-h-screen bg-page grid" style={{ minWidth: 1180, gridTemplateColumns: '236px minmax(0,1fr)' }}>
        <aside
          className="sticky top-0 bg-white flex flex-col"
          style={{ height: '100vh', borderRight: '1px solid #F0F0F0', padding: '20px 14px', gap: 24 }}
        >
          <div className="flex items-center" style={{ gap: 10, padding: '0 8px' }}>
            <div className="flex items-center">
              <div className="rounded-full" style={{ width: 14, height: 14, background: '#0075FF' }} />
              <div className="rounded-full" style={{ width: 14, height: 14, background: '#2FC6F6', marginLeft: -5 }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.2px' }}>Один на один</div>
          </div>

          <nav className="flex flex-col" style={{ gap: 2 }}>
            <NavItem label="Команда" badge={loaded ? employees.length : undefined} active={isTeam} onClick={() => navigate('/')} />
            <NavItem
              label="Встреча"
              active={path.startsWith('/meeting')}
              onClick={() => next && navigate(`/meeting/${next.id}`)}
            />
            <NavItem label="Дейли" active={path === '/daily'} onClick={() => navigate('/daily')} />
            <NavItem label="Важное" active={path === '/important'} onClick={() => navigate('/important')} />
            <NavItem label="Командные заметки" badge={loaded ? scrumNotes.length : undefined} active={path === '/scrum'} onClick={() => navigate('/scrum')} />
            <NavItem label="История" badge={loaded ? meetings.length : undefined} active={path === '/history'} onClick={() => navigate('/history')} />
          </nav>

          {next && (
            <div className="flex flex-col" style={{ gap: 9 }}>
              <div className="eyebrow" style={{ padding: '0 10px' }}>Ближайшая встреча</div>
              <div
                onClick={() => navigate(`/employees/${next.id}`)}
                className="cursor-pointer transition-colors"
                style={{ border: '1px solid #F0F0F0', borderRadius: 12, padding: 12, transitionDuration: '.18s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#CFE3FF'; e.currentTarget.style.background = '#F8FBFF' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#F0F0F0'; e.currentTarget.style.background = 'transparent' }}
              >
                <div className="flex items-center" style={{ gap: 9 }}>
                  <Avatar name={next.name} id={next.id} url={next.avatarUrl} size={28} />
                  <div className="flex flex-col min-w-0" style={{ gap: 1 }}>
                    <div className="truncate" style={{ fontSize: 13, fontWeight: 500 }}>{next.name}</div>
                    <div style={{ fontSize: 12, color: '#828B95' }}>{urgency(next.lastMeetingDate, next.nextMeetingAt).label}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-auto flex flex-col" style={{ gap: 8 }}>
            <div style={{ padding: '0 10px' }}>
              <ClockWidget />
            </div>
            <div
              className="flex items-center cursor-pointer transition-colors group"
              style={{ gap: 10, padding: 10, borderRadius: 12, transitionDuration: '.18s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F6FAFB' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              onClick={handleLogout}
              title="Выйти"
            >
              {owner ? (
                <Avatar name={owner.name} id={0} url={owner.avatarUrl} size={30} />
              ) : (
                <div
                  className="rounded-full grid place-items-center flex-none text-white"
                  style={{ width: 30, height: 30, background: '#21334C', fontSize: 11, fontWeight: 600 }}
                >
                  ТЛ
                </div>
              )}
              <div className="flex flex-col min-w-0" style={{ gap: 1 }}>
                <div className="truncate" style={{ fontSize: 13, fontWeight: 500 }}>{owner?.name ?? 'Тимлид'}</div>
                <div style={{ fontSize: 12, color: '#828B95' }}>
                  {(() => {
                    const reports = employees.filter(e => !e.isManager).length
                    return reports > 0 ? `Тимлид · ${reports} ${plural(reports, 'человек', 'человека', 'человек')}` : 'Выйти'
                  })()}
                </div>
              </div>
              <svg
                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#828B95" strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
          </div>
        </aside>

        <main style={{ padding: '28px 34px 48px', minWidth: 0 }}>
          {screenLoading ? <SkeletonScreen /> : children}
        </main>
      </div>
      <DailyWidget />
      </DailyProvider>
    </ShellContext.Provider>
  )
}
