import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShell } from '../layout/AppShell'
import { Avatar, Card, MoodDot, Pill, formatDateRu } from '../ui'

function statusOf(mood: number | null): { label: string; color: string } | null {
  if (mood == null) return null
  if (mood >= 4) return { label: 'Всё хорошо', color: '#1BCE7B' }
  if (mood === 3) return { label: 'Есть риски', color: '#FAA72C' }
  return { label: 'Нужно внимание', color: '#FF5752' }
}

function Stat({ label, value, delay }: { label: string; value: string; delay: number }) {
  return (
    <Card className="anim-fade-up" style={{ padding: '18px 20px', animationDuration: '.5s', animationDelay: `${delay}s` }}>
      <div style={{ fontSize: 13, color: '#525C69' }}>{label}</div>
      <div className="tabular-nums" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-.9px', marginTop: 6 }}>
        {value}
      </div>
    </Card>
  )
}

export default function HistoryPage() {
  const { meetings, loaded } = useShell()
  const navigate = useNavigate()

  const avgDuration = useMemo(() => {
    const withDur = meetings.filter(m => m.duration != null && m.duration > 0)
    if (withDur.length === 0) return null
    return Math.round(withDur.reduce((s, m) => s + (m.duration as number), 0) / withDur.length)
  }, [meetings])

  const avgMood = useMemo(() => {
    const withMood = meetings.filter(m => m.mood != null)
    if (withMood.length === 0) return null
    return (withMood.reduce((s, m) => s + (m.mood as number), 0) / withMood.length).toFixed(1).replace('.', ',')
  }, [meetings])

  return (
    <div className="flex flex-col" style={{ gap: 24 }}>
      <div className="flex flex-col anim-fade-up" style={{ gap: 6 }}>
        <div className="eyebrow">Архив</div>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-.8px' }}>История встреч</div>
      </div>

      <div className="grid grid-cols-3" style={{ gap: 16 }}>
        <Stat label="Всего встреч" value={String(meetings.length)} delay={0} />
        <Stat label="Средняя длительность" value={avgDuration ? `${avgDuration} мин` : '—'} delay={0.07} />
        <Stat label="Средний пульс" value={avgMood ?? '—'} delay={0.14} />
      </div>

      <Card className="overflow-hidden">
        {loaded && meetings.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', fontSize: 14, color: '#828B95' }}>
            Здесь появятся все проведённые 1-1
          </div>
        ) : (
          meetings.map((m, i) => {
            const status = statusOf(m.mood)
            const topics = m.discussedTopics.length > 0 ? m.discussedTopics.join(' · ') : m.notes.split('\n')[0]
            return (
              <div
                key={m.id}
                onClick={() => navigate(`/employees/${m.employeeId}`)}
                className="grid items-center cursor-pointer transition-colors anim-fade-up"
                style={{
                  gridTemplateColumns: '120px 1fr 90px 130px 12px',
                  gap: 16,
                  padding: '15px 20px',
                  borderBottom: i < meetings.length - 1 ? '1px solid #F7F7F7' : 'none',
                  transitionDuration: '.15s',
                  animationDuration: '.45s',
                  animationDelay: `${Math.min(i, 20) * 0.04}s`,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F8FBFF' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: 13, color: '#828B95' }}>{formatDateRu(m.date)}</span>
                <div className="flex items-center min-w-0" style={{ gap: 10 }}>
                  <Avatar name={m.employeeName} id={m.employeeId} url={m.employeeAvatarUrl} size={30} />
                  <div className="min-w-0">
                    <div className="truncate" style={{ fontSize: 14, fontWeight: 500 }}>{m.employeeName}</div>
                    <div className="truncate" style={{ fontSize: 12, color: '#828B95' }}>{topics || '—'}</div>
                  </div>
                </div>
                <span style={{ fontSize: 13, color: '#525C69' }}>{m.duration ? `${m.duration} мин` : '—'}</span>
                <span>{status ? <Pill color={status.color}>{status.label}</Pill> : null}</span>
                <MoodDot mood={m.mood} />
              </div>
            )
          })
        )}
      </Card>
    </div>
  )
}
