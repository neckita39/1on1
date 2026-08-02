import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { meetingsApi } from '../api/client'
import { useShell } from '../layout/AppShell'
import { useToast } from '../ui/toast'
import { Avatar, Card, MoodDot, Pill, formatDateRu, useIsMobile } from '../ui'

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
  const { meetings, loaded, reload } = useShell()
  const navigate = useNavigate()
  const toast = useToast()
  const isMobile = useIsMobile()
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const removeMeeting = async (id: number) => {
    try {
      await meetingsApi.delete(id)
      toast('Встреча удалена')
      setConfirmId(null)
      await reload()
    } catch (e) {
      console.error('Failed to delete meeting', e)
    }
  }

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
    <div className="flex flex-col gap-5 md:gap-6">
      <div className="flex flex-col anim-fade-up" style={{ gap: 6 }}>
        <div className="eyebrow">Архив</div>
        <div className="text-[24px] md:text-[28px]" style={{ fontWeight: 600, letterSpacing: '-.8px' }}>
          История встреч
        </div>
      </div>

      <div className="mobile-carousel md:grid md:grid-cols-3" style={{ gap: 16 }}>
        <Stat label="Всего встреч" value={String(meetings.length)} delay={0} />
        <Stat label="Средняя длительность" value={avgDuration ? `${avgDuration} мин` : '—'} delay={0.07} />
        <Stat label="Средний пульс" value={avgMood ?? '—'} delay={0.14} />
      </div>

      <Card className="overflow-hidden">
        {loaded && meetings.length === 0 ? (
          <div className="py-10 px-5 md:p-12" style={{ textAlign: 'center', fontSize: 14, color: '#828B95' }}>
            Здесь появятся все проведённые 1-1
          </div>
        ) : (
          meetings.map((m, i) => {
            const status = statusOf(m.mood)
            const topics = m.discussedTopics.length > 0 ? m.discussedTopics.join(' · ') : m.notes.split('\n')[0]
            const deleteButton = confirmId === m.id ? (
              <button
                onClick={e => { e.stopPropagation(); removeMeeting(m.id) }}
                className="tap-sm"
                style={{ fontSize: 12, fontWeight: 500, color: '#FF5752', whiteSpace: 'nowrap' }}
              >
                Удалить?
              </button>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); setConfirmId(m.id) }}
                className="opacity-0 group-hover:opacity-100 transition-opacity touch-visible tap-sm"
                title="Удалить встречу"
                aria-label="Удалить встречу"
                style={{ fontSize: 13, color: '#A5AEB8' }}
              >
                ✕
              </button>
            )

            // На телефоне строка таблицы становится карточкой в две строки
            if (isMobile) {
              return (
                <div
                  key={m.id}
                  onClick={() => navigate(`/employees/${m.employeeId}`)}
                  className="flex flex-col anim-fade-up"
                  style={{
                    gap: 8,
                    padding: '14px 16px',
                    borderBottom: i < meetings.length - 1 ? '1px solid #F7F7F7' : 'none',
                    animationDuration: '.45s',
                    animationDelay: `${Math.min(i, 20) * 0.04}s`,
                  }}
                >
                  <div className="flex items-center min-w-0" style={{ gap: 10 }}>
                    <Avatar name={m.employeeName} id={m.employeeId} url={m.employeeAvatarUrl} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate" style={{ fontSize: 15, fontWeight: 500 }}>{m.employeeName}</div>
                      <div className="truncate" style={{ fontSize: 13, color: '#828B95' }}>{topics || '—'}</div>
                    </div>
                    {deleteButton}
                  </div>
                  <div className="flex items-center flex-wrap" style={{ gap: 8, paddingLeft: 44 }}>
                    <span style={{ fontSize: 12, color: '#828B95' }}>{formatDateRu(m.date)}</span>
                    {m.duration ? <span style={{ fontSize: 12, color: '#A5AEB8' }}>· {m.duration} мин</span> : null}
                    {status && <Pill color={status.color}>{status.label}</Pill>}
                    <MoodDot mood={m.mood} />
                  </div>
                </div>
              )
            }

            return (
              <div
                key={m.id}
                onClick={() => navigate(`/employees/${m.employeeId}`)}
                className="grid items-center cursor-pointer transition-colors anim-fade-up group"
                style={{
                  gridTemplateColumns: '120px 1fr 90px 130px 12px auto',
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
                {deleteButton}
              </div>
            )
          })
        )}
      </Card>
    </div>
  )
}
