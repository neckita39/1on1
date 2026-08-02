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

// ————— мобильная навигация —————

// Иконки таб-бара: тот же штрих, что и в остальных svg приложения.
// «Встреча» — фирменный знак из двух кружков, как в шапке сайдбара.
const TAB_ICONS: Record<string, ReactNode> = {
  team: (
    <>
      <circle cx="9.2" cy="8.4" r="3.3" />
      <path d="M3.4 19.4c0-3.1 2.6-5.2 5.8-5.2s5.8 2.1 5.8 5.2" />
      <path d="M16.4 6.2a3.1 3.1 0 0 1 0 5.9" />
      <path d="M17.8 14.6c1.7.7 2.8 2.2 2.8 4.4" />
    </>
  ),
  meeting: (
    <>
      <circle cx="9.4" cy="12" r="5.2" />
      <circle cx="14.6" cy="12" r="5.2" />
    </>
  ),
  daily: (
    <>
      <path d="M20.2 12a8.2 8.2 0 1 1-2.4-5.8" />
      <path d="M20.4 4.4v4.2h-4.2" />
    </>
  ),
  important: (
    <path d="M12 3.4l2.7 5.5 6 .9-4.35 4.24 1.03 6-5.38-2.83L6.6 20.04l1.03-6L3.28 9.8l6-.9L12 3.4z" />
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none" />
    </>
  ),
}

function TabButton({ icon, label, active, disabled, badge, onClick }: {
  icon: string
  label: string
  active: boolean
  disabled?: boolean
  badge?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? 'page' : undefined}
      className="flex-1 flex flex-col items-center justify-center relative"
      style={{
        gap: 4,
        height: 58,
        color: active ? '#0075FF' : '#828B95',
        opacity: disabled ? 0.4 : 1,
        transition: 'color .2s',
      }}
    >
      <span className="relative grid place-items-center" style={{ width: 24, height: 24 }}>
        <svg
          width="23" height="23" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.7}
          strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: active ? 'translateY(-1px)' : 'none', transition: 'transform .25s cubic-bezier(.22,1,.36,1)' }}
        >
          {TAB_ICONS[icon]}
        </svg>
        {badge !== undefined && badge > 0 && (
          <span
            className="absolute rounded-pill tabular-nums"
            style={{
              top: -5, right: -12, minWidth: 16, height: 16, padding: '0 4px',
              fontSize: 10, lineHeight: '16px', textAlign: 'center',
              background: '#FF5752', color: '#fff', fontWeight: 500,
            }}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span style={{ fontSize: 10, fontWeight: active ? 500 : 400, letterSpacing: '.1px' }}>{label}</span>
    </button>
  )
}

function MoreSheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[75] flex items-end anim-fade-in md:hidden"
      style={{ background: 'rgba(10,27,51,.34)', animationDuration: '.2s' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full modal-sheet"
        style={{
          borderRadius: '20px 20px 0 0',
          padding: '10px 16px calc(18px + env(safe-area-inset-bottom, 0px))',
          boxShadow: '0 -10px 40px rgba(10,27,51,.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="grid place-items-center" style={{ padding: '2px 0 12px' }}>
          <span style={{ width: 38, height: 4, borderRadius: 4, background: '#DCE4EA' }} />
        </div>
        {children}
      </div>
    </div>
  )
}

function SheetRow({ label, badge, active, onClick }: {
  label: string
  badge?: number
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center w-full text-left"
      style={{
        gap: 11,
        minHeight: 50,
        padding: '0 12px',
        borderRadius: 12,
        fontSize: 15,
        background: active ? '#EAF3FF' : 'transparent',
        color: active ? '#0154C8' : '#333',
        fontWeight: active ? 500 : 400,
      }}
    >
      <span
        className="rounded-full flex-none"
        style={{ width: 6, height: 6, background: active ? '#0075FF' : '#D5DDE5' }}
      />
      <span>{label}</span>
      {badge !== undefined && (
        <span
          className="ml-auto rounded-pill"
          style={{
            fontSize: 12, padding: '3px 9px',
            background: active ? '#DCEBFF' : '#F4F7FA',
            color: active ? '#0154C8' : '#A5AEB8',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  )
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
      <span className="truncate">{label}</span>
      {badge !== undefined && (
        <span
          className="ml-auto rounded-pill flex-none"
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
  const [showMore, setShowMore] = useState(false)
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
    setShowMore(false)
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
      <div className="min-h-screen bg-page grid grid-cols-1 md:grid-cols-[236px_minmax(0,1fr)]">
        <aside
          className="sticky top-0 bg-white hidden md:flex flex-col"
          style={{ height: '100dvh', borderRight: '1px solid #F0F0F0', padding: '20px 14px', gap: 24 }}
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

        <main
          className="px-4 pt-4 md:px-[34px] md:pt-7 md:pb-12"
          style={{ minWidth: 0, paddingBottom: 'calc(var(--tabbar) + var(--safe-b) + 22px)' }}
        >
          {screenLoading ? <SkeletonScreen /> : children}
        </main>
      </div>

      {/* Мобильная навигация: большой палец достаёт до низа экрана */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-[60] flex items-stretch"
        style={{
          background: 'rgba(255,255,255,.92)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderTop: '1px solid #F0F0F0',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <TabButton icon="team" label="Команда" active={isTeam} onClick={() => navigate('/')} />
        <TabButton
          icon="meeting"
          label="Встреча"
          active={path.startsWith('/meeting')}
          disabled={!next}
          onClick={() => next && navigate(`/meeting/${next.id}`)}
        />
        <TabButton icon="daily" label="Дейли" active={path === '/daily'} onClick={() => navigate('/daily')} />
        <TabButton icon="important" label="Важное" active={path === '/important'} onClick={() => navigate('/important')} />
        <TabButton
          icon="more"
          label="Ещё"
          active={showMore || path === '/scrum' || path === '/history'}
          onClick={() => setShowMore(true)}
        />
      </nav>

      {showMore && (
        <MoreSheet onClose={() => setShowMore(false)}>
          <div className="flex flex-col" style={{ gap: 4 }}>
            {next && (
              <>
                <div className="eyebrow" style={{ padding: '0 12px 6px' }}>Ближайшая встреча</div>
                <button
                  onClick={() => { setShowMore(false); navigate(`/employees/${next.id}`) }}
                  className="flex items-center w-full text-left"
                  style={{ gap: 11, padding: 12, borderRadius: 14, border: '1px solid #F0F0F0', marginBottom: 8 }}
                >
                  <Avatar name={next.name} id={next.id} url={next.avatarUrl} size={36} />
                  <span className="flex flex-col min-w-0" style={{ gap: 2 }}>
                    <span className="truncate block" style={{ fontSize: 15, fontWeight: 500 }}>{next.name}</span>
                    <span style={{ fontSize: 13, color: '#828B95' }}>
                      {urgency(next.lastMeetingDate, next.nextMeetingAt).label}
                    </span>
                  </span>
                </button>
              </>
            )}

            <SheetRow
              label="Командные заметки"
              badge={loaded ? scrumNotes.length : undefined}
              active={path === '/scrum'}
              onClick={() => { setShowMore(false); navigate('/scrum') }}
            />
            <SheetRow
              label="История"
              badge={loaded ? meetings.length : undefined}
              active={path === '/history'}
              onClick={() => { setShowMore(false); navigate('/history') }}
            />

            <div className="flex items-center justify-between" style={{ borderTop: '1px solid #F7F7F7', marginTop: 8, paddingTop: 12 }}>
              <div className="flex items-center min-w-0" style={{ gap: 10 }}>
                {owner ? (
                  <Avatar name={owner.name} id={0} url={owner.avatarUrl} size={34} />
                ) : (
                  <div
                    className="rounded-full grid place-items-center flex-none text-white"
                    style={{ width: 34, height: 34, background: '#21334C', fontSize: 12, fontWeight: 600 }}
                  >
                    ТЛ
                  </div>
                )}
                <div className="flex flex-col min-w-0" style={{ gap: 1 }}>
                  <div className="truncate" style={{ fontSize: 14, fontWeight: 500 }}>{owner?.name ?? 'Тимлид'}</div>
                  <ClockWidget />
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="btn-spec rounded-[10px] bg-white"
                style={{ border: '1px solid #E2E2E2', padding: '0 16px', fontSize: 15, color: '#525C69' }}
              >
                Выйти
              </button>
            </div>
          </div>
        </MoreSheet>
      )}

      <DailyWidget />
      </DailyProvider>
    </ShellContext.Provider>
  )
}
