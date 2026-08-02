import { ReactNode, ButtonHTMLAttributes, useEffect, useState } from 'react'

// ————— палитра и хелперы —————

// Брейкпоинт совпадает с Tailwind md и с мобильным слоем в index.css
export const MOBILE_QUERY = '(max-width: 767px)'

// Нужен там, где мобильная и десктопная разметка расходятся по DOM:
// шторка вместо модалки, стрелки вместо drag & drop, порядок блоков.
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  )
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener('change', onChange)
    setMobile(mq.matches)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return mobile
}

export const AVATAR_COLORS = ['#0075FF', '#853AF5', '#1BCE7B', '#FAA72C', '#2FC6F6', '#5B22B0']

export function avatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length]
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('')
}

export function moodColor(mood: number): string {
  if (mood >= 4) return '#1BCE7B'
  if (mood === 3) return '#FAA72C'
  return '#FF5752'
}

const MS_DAY = 86400000

// dueDays: сколько дней осталось до «пора встретиться» (ритм — раз в 7 дней).
// < 0 — просрочено, 0 — сегодня, null — встреч ещё не было (считаем срочным).
export function dueDays(lastMeetingDate: string | null): number | null {
  if (!lastMeetingDate) return null
  const last = new Date(lastMeetingDate + 'T00:00:00')
  const daysSince = Math.floor((Date.now() - last.getTime()) / MS_DAY)
  return 7 - daysSince
}

const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

function daysUntil(date: Date): number {
  const startToday = new Date()
  startToday.setHours(0, 0, 0, 0)
  const startThat = new Date(date)
  startThat.setHours(0, 0, 0, 0)
  return Math.round((startThat.getTime() - startToday.getTime()) / MS_DAY)
}

// Срочность: если из календаря Б24 известна следующая встреча — по ней,
// иначе по давности последнего 1-1 (ритм раз в 7 дней).
export function urgency(
  lastMeetingDate: string | null,
  nextMeetingAt?: string | null
): { label: string; color: string; due: number } {
  if (nextMeetingAt) {
    const next = new Date(nextMeetingAt.replace(' ', 'T'))
    if (!isNaN(next.getTime())) {
      const due = daysUntil(next)
      const time = next.toTimeString().slice(0, 5)
      if (due <= 0) return { label: `Сегодня, ${time}`, color: '#FAA72C', due: 0 }
      if (due === 1) return { label: `Завтра, ${time}`, color: '#FAA72C', due }
      const label = `${WEEKDAYS_SHORT[next.getDay()]}, ${formatDateRu(nextMeetingAt.slice(0, 10))}, ${time}`
      return { label, color: due <= 3 ? '#FAA72C' : '#1BCE7B', due }
    }
  }
  const due = dueDays(lastMeetingDate)
  if (due === null) return { label: 'Ещё не было 1-1', color: '#FF5752', due: -999 }
  if (due < 0) return { label: `Просрочено на ${-due} ${plural(-due, 'день', 'дня', 'дней')}`, color: '#FF5752', due }
  if (due === 0) return { label: 'Сегодня', color: '#FAA72C', due }
  if (due <= 3) return { label: `Через ${due} ${plural(due, 'день', 'дня', 'дней')}`, color: '#FAA72C', due }
  return { label: `Через ${due} ${plural(due, 'день', 'дня', 'дней')}`, color: '#1BCE7B', due }
}

export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100
  const d = abs % 10
  if (abs > 10 && abs < 20) return many
  if (d === 1) return one
  if (d >= 2 && d <= 4) return few
  return many
}

const MONTHS_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

export function formatDateRu(dateString: string): string {
  const d = new Date(dateString.length <= 10 ? dateString + 'T00:00:00' : dateString)
  if (isNaN(d.getTime())) return dateString
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`
}

export function formatDateRuFull(dateString: string): string {
  const d = new Date(dateString.length <= 10 ? dateString + 'T00:00:00' : dateString)
  if (isNaN(d.getTime())) return dateString
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`
}

// пилюля-тег: фон = цвет + альфа ~9%
export function tagBg(color: string): string {
  return color + '18'
}

// ————— компоненты —————

export function Avatar({ name, id, url, size = 42, className = '' }: {
  name: string
  id: number
  url?: string | null
  size?: number
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const fontSize = Math.max(9, Math.round(size / 3))
  if (url && !failed) {
    return (
      <img
        src={url}
        alt={name}
        onError={() => setFailed(true)}
        className={`rounded-full object-cover flex-none ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className={`rounded-full grid place-items-center flex-none text-white font-semibold ${className}`}
      style={{ width: size, height: size, background: avatarColor(id), fontSize }}
    >
      {initials(name)}
    </div>
  )
}

export function Pill({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      className="rounded-pill inline-block"
      style={{ fontSize: 11, padding: '2px 8px', background: tagBg(color), color }}
    >
      {children}
    </span>
  )
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  size?: 'md' | 'lg'
  sheen?: boolean
}

export function Button({ variant = 'primary', size = 'md', sheen = false, className = '', children, ...rest }: BtnProps) {
  const height = size === 'lg' ? 46 : 40
  if (variant === 'primary') {
    return (
      <button
        {...rest}
        className={`btn-spec relative overflow-hidden rounded-[10px] bg-primary text-white font-medium text-[15px] px-[18px] transition-[background,transform] duration-150 hover:bg-primary-hover active:scale-[.985] disabled:opacity-50 disabled:pointer-events-none ${className}`}
        style={{ height }}
      >
        {sheen && (
          <span
            className="absolute top-0 left-0 h-full pointer-events-none"
            style={{
              width: '40%',
              background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent)',
              animation: 'sheen 3.2s ease-in-out 1.2s infinite',
            }}
          />
        )}
        {children}
      </button>
    )
  }
  return (
    <button
      {...rest}
      className={`btn-spec rounded-[10px] bg-white border border-line-accent text-ink text-[13px] md:text-[13px] max-md:text-[15px] px-[15px] transition-colors duration-150 hover:bg-blue-tint-light hover:border-hover-border-deep active:scale-[.985] disabled:opacity-50 disabled:pointer-events-none ${className}`}
      style={{ height: size === 'lg' ? 44 : 38 }}
    >
      {children}
    </button>
  )
}

export function SpecCheckbox({ checked, onChange, color = '#0075FF' }: {
  checked: boolean
  onChange: () => void
  color?: string
}) {
  return (
    // внешняя кнопка — зона нажатия (на мобильном её растит .check-hit),
    // внутренний квадрат — сам чекбокс
    <button
      type="button"
      onClick={onChange}
      className="check-hit grid place-items-center flex-none"
      aria-pressed={checked}
    >
      <span
        className="grid place-items-center transition-colors duration-200"
        style={{
          width: 18,
          height: 18,
          borderRadius: 6,
          border: checked ? `1.5px solid ${color}` : '1.5px solid #D5DDE5',
          background: checked ? color : '#fff',
        }}
      >
        {checked && (
          <span
            className="bg-white"
            style={{ width: 8, height: 8, borderRadius: 2, animation: 'checkIn .25s cubic-bezier(.22,1,.36,1) both' }}
          />
        )}
      </span>
    </button>
  )
}

export function Toggle({ on, onChange, color = '#0075FF' }: { on: boolean; onChange: () => void; color?: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={on}
      className="check-hit grid place-items-center flex-none"
    >
      <span
        className="rounded-pill block transition-colors"
        style={{ width: 38, height: 22, padding: 2, background: on ? color : '#DCE4EA', transitionDuration: '.22s' }}
      >
        <span
          className="block bg-white rounded-full"
          style={{
            width: 18,
            height: 18,
            boxShadow: '0 1px 3px rgba(0,0,0,.2)',
            transform: on ? 'translateX(16px)' : 'translateX(0)',
            transition: 'transform .22s cubic-bezier(.22,1,.36,1)',
          }}
        />
      </span>
    </button>
  )
}

export function Card({ children, className = '', style, hover = false, onClick }: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  hover?: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-line rounded-2xl ${hover ? 'transition-[border-color,box-shadow,transform] duration-200 hover:border-hover-border hover:shadow-[0_10px_26px_rgba(16,42,77,.07)] hover:-translate-y-[3px] cursor-pointer' : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

// На мобильном модалка превращается в шторку снизу: ближе к пальцу,
// не прыгает при появлении клавиатуры и скроллится внутри себя.
export function Modal({ onClose, children, maxWidth = 440 }: {
  onClose: () => void
  children: ReactNode
  maxWidth?: number
}) {
  const mobile = useIsMobile()

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  if (mobile) {
    return (
      <div
        className="fixed inset-0 z-[70] flex items-end anim-fade-in"
        style={{ background: 'rgba(10,27,51,.34)', animationDuration: '.22s' }}
        onClick={onClose}
      >
        <div
          className="bg-white w-full modal-sheet overflow-y-auto overscroll-contain"
          style={{
            borderRadius: '20px 20px 0 0',
            padding: '10px 18px calc(20px + env(safe-area-inset-bottom, 0px))',
            maxHeight: '88dvh',
            boxShadow: '0 -10px 40px rgba(10,27,51,.18)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="grid place-items-center" style={{ padding: '2px 0 14px' }}>
            <span style={{ width: 38, height: 4, borderRadius: 4, background: '#DCE4EA' }} />
          </div>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center anim-fade-in"
      style={{ background: 'rgba(10,27,51,.28)', animationDuration: '.22s', padding: 16 }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full anim-modal-in overflow-y-auto"
        style={{ maxWidth, maxHeight: '92vh', borderRadius: 18, padding: 26, boxShadow: '0 20px 60px rgba(10,27,51,.22)' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function MoodDot({ mood, size = 9 }: { mood: number | null; size?: number }) {
  return (
    <span
      className="rounded-full inline-block flex-none"
      style={{ width: size, height: size, background: mood ? moodColor(mood) : '#D5DDE5' }}
    />
  )
}

export function Spinner({ size = 13 }: { size?: number }) {
  return (
    <span
      className="inline-block rounded-full flex-none"
      style={{
        width: size,
        height: size,
        border: '2px solid #CFE3FF',
        borderTopColor: '#0075FF',
        animation: 'spin .8s linear infinite',
      }}
    />
  )
}

export function SkeletonScreen() {
  return (
    <div className="flex flex-col gap-[18px] anim-fade-in" style={{ animationDuration: '.2s' }}>
      <div className="skeleton" style={{ height: 34, width: 'min(280px,70%)', borderRadius: 10 }} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="skeleton" style={{ height: 96, borderRadius: 16, animationDelay: '.1s' }} />
        <div className="skeleton" style={{ height: 96, borderRadius: 16, animationDelay: '.2s' }} />
        <div className="skeleton hidden md:block" style={{ height: 96, borderRadius: 16, animationDelay: '.15s' }} />
      </div>
      <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />
    </div>
  )
}
