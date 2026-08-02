import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Employee } from '../api/client'
import { Avatar, useIsMobile } from '../ui'

// Дейли живёт глобально: страницу можно покинуть, виджет остаётся поверх всего

type Phase = 'idle' | 'running' | 'done'

interface DailyState {
  phase: Phase
  order: Employee[]
  currentIndex: number
  start: (employees: Employee[]) => void
  next: () => void
  finish: () => void
  reset: () => void
}

const DailyContext = createContext<DailyState>({
  phase: 'idle',
  order: [],
  currentIndex: 0,
  start: () => {},
  next: () => {},
  finish: () => {},
  reset: () => {},
})

export const useDaily = () => useContext(DailyContext)

function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function DailyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ phase: Phase; order: Employee[]; currentIndex: number }>({
    phase: 'idle',
    order: [],
    currentIndex: 0,
  })

  const start = useCallback((employees: Employee[]) => {
    if (employees.length === 0) return
    setState({ phase: 'running', order: shuffle(employees), currentIndex: 0 })
  }, [])

  const next = useCallback(() => {
    setState(s => {
      if (s.phase !== 'running') return s
      const ni = s.currentIndex + 1
      return ni >= s.order.length ? { ...s, phase: 'done' } : { ...s, currentIndex: ni }
    })
  }, [])

  const finish = useCallback(() => setState(s => ({ ...s, phase: 'done' })), [])
  const reset = useCallback(() => setState({ phase: 'idle', order: [], currentIndex: 0 }), [])

  return (
    <DailyContext.Provider value={{ ...state, start, next, finish, reset }}>
      {children}
    </DailyContext.Provider>
  )
}

const POS_KEY = 'daily-widget-pos'

export function DailyWidget() {
  const { phase, order, currentIndex, next } = useDaily()
  const location = useLocation()
  const navigate = useNavigate()
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(POS_KEY) || 'null')
    } catch {
      return null
    }
  })
  const boxRef = useRef<HTMLDivElement>(null)
  const mobile = useIsMobile()

  if (phase !== 'running' || location.pathname === '/daily') return null

  const current = order[currentIndex]
  if (!current) return null
  const isLast = currentIndex + 1 >= order.length

  const onPointerDown = (e: React.PointerEvent) => {
    if (mobile) return
    if ((e.target as HTMLElement).closest('button')) return
    const box = boxRef.current
    if (!box) return
    const rect = box.getBoundingClientRect()
    const dx = e.clientX - rect.left
    const dy = e.clientY - rect.top
    const move = (ev: PointerEvent) => {
      const x = Math.max(8, Math.min(window.innerWidth - rect.width - 8, ev.clientX - dx))
      const y = Math.max(8, Math.min(window.innerHeight - rect.height - 8, ev.clientY - dy))
      setPos({ x, y })
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      const x = Math.max(8, Math.min(window.innerWidth - rect.width - 8, ev.clientX - dx))
      const y = Math.max(8, Math.min(window.innerHeight - rect.height - 8, ev.clientY - dy))
      localStorage.setItem(POS_KEY, JSON.stringify({ x, y }))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div
      ref={boxRef}
      onPointerDown={onPointerDown}
      className="fixed z-[55] bg-white anim-pop-in select-none"
      style={{
        // на телефоне виджет живёт над таб-баром во всю ширину — сохранённые
        // с десктопа координаты там оказались бы за экраном
        ...(mobile
          ? { left: 12, right: 12, bottom: 'calc(var(--tabbar) + var(--safe-b) + 12px)' }
          : pos
            ? { left: pos.x, top: pos.y }
            : { right: 24, bottom: 24 }),
        borderRadius: 14,
        border: '1px solid #F0F0F0',
        boxShadow: '0 12px 34px rgba(10,27,51,.18)',
        padding: '10px 12px',
        cursor: mobile ? 'default' : 'grab',
        touchAction: 'none',
        animationDuration: '.3s',
      }}
    >
      <div className="flex items-center" style={{ gap: 10 }}>
        {!mobile && (
          <span className="flex flex-col flex-none" style={{ gap: 3 }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{ width: 10, height: 2, borderRadius: 1, background: '#C9D3DC' }} />
            ))}
          </span>
        )}
        <Avatar name={current.name} id={current.id} url={current.avatarUrl} size={28} />
        <div className="flex flex-col min-w-0 flex-1" style={{ gap: 0 }}>
          <span className="truncate block" style={{ fontSize: 13, fontWeight: 500, maxWidth: mobile ? '100%' : 140 }}>{current.name}</span>
          <span className="tabular-nums" style={{ fontSize: 11, color: '#A5AEB8' }}>
            дейли · {currentIndex + 1}/{order.length}
          </span>
        </div>
        <button
          onClick={next}
          className="tap-sm rounded-[8px] bg-primary text-white font-medium transition-colors hover:bg-primary-hover flex-none"
          style={{ height: 28, padding: '0 14px', fontSize: 12 }}
        >
          {isLast ? 'Готово' : 'Некст'}
        </button>
        <button
          onClick={() => navigate('/daily')}
          title="Открыть дейли"
          className="tap-sm flex-none transition-colors"
          style={{ fontSize: 12, color: '#A5AEB8' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#525C69' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#A5AEB8' }}
        >
          ⤢
        </button>
      </div>
    </div>
  )
}
