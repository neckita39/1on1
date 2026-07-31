import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { agendaApi, employeesApi, meetingsApi, Employee, AgendaItem } from '../api/client'
import { useShell } from '../layout/AppShell'
import { Avatar, Button, Card, SpecCheckbox, moodColor } from '../ui'
import { useToast } from '../ui/toast'
import { CATEGORY_META } from '../components/AgendaList'

function fmt(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function MeetingPage() {
  const { id } = useParams<{ id: string }>()
  const employeeId = parseInt(id || '0')
  const navigate = useNavigate()
  const toast = useToast()
  const { reload: reloadShell } = useShell()

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [agenda, setAgenda] = useState<AgendaItem[]>([])
  const [notes, setNotes] = useState(() => localStorage.getItem(`meeting-draft-${employeeId}`) || '')
  const [saved, setSaved] = useState(true)
  const [mood, setMood] = useState(0)
  const [running, setRunning] = useState(true)
  const [secs, setSecs] = useState(0)
  const [draft, setDraft] = useState('')
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [overId, setOverId] = useState<number | null>(null)
  const [finishing, setFinishing] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  const load = async () => {
    try {
      const [empRes, agendaRes] = await Promise.all([
        employeesApi.get(employeeId),
        agendaApi.list(employeeId),
      ])
      setEmployee(empRes.data)
      setAgenda(agendaRes.data)
    } catch (e) {
      console.error('Failed to load meeting data', e)
      navigate('/')
    }
  }

  useEffect(() => {
    load()
  }, [employeeId])

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setSecs(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [running])

  const handleNotes = (value: string) => {
    setNotes(value)
    setSaved(false)
    localStorage.setItem(`meeting-draft-${employeeId}`, value)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSaved(true), 1400)
  }

  const toggleItem = async (item: AgendaItem) => {
    await agendaApi.update(item.id, { isDiscussed: !item.isDiscussed }).catch(console.error)
    load()
  }

  const addItem = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!draft.trim()) return
    await agendaApi.create(employeeId, draft.trim()).catch(console.error)
    setDraft('')
    load()
  }

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault()
    setOverId(null)
    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null)
      return
    }
    const active = agenda.filter(i => !i.isDiscussed)
    const from = active.findIndex(i => i.id === draggedId)
    const to = active.findIndex(i => i.id === targetId)
    setDraggedId(null)
    if (from === -1 || to === -1) return
    const reordered = [...active]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    await agendaApi.reorder(employeeId, reordered.map(i => i.id)).catch(console.error)
    load()
  }

  const finish = async () => {
    if (!employee) return
    setFinishing(true)
    try {
      const discussed = agenda.filter(i => i.isDiscussed).map(i => i.content)
      await meetingsApi.create(employeeId, {
        notes,
        discussedTopics: discussed,
        ...(mood > 0 ? { mood } : {}),
        ...(secs >= 60 ? { duration: Math.round(secs / 60) } : {}),
      })
      localStorage.removeItem(`meeting-draft-${employeeId}`)
      toast(employee.bitrixId ? 'Встреча завершена, итоги сохранены' : 'Встреча завершена')
      await reloadShell()
      navigate('/history')
    } catch (e) {
      console.error('Failed to finish meeting', e)
      setFinishing(false)
    }
  }

  const done = useMemo(() => agenda.filter(i => i.isDiscussed).length, [agenda])
  const total = agenda.length
  const activeItems = agenda.filter(i => !i.isDiscussed)
  const discussedItems = agenda.filter(i => i.isDiscussed)

  if (!employee) return null

  return (
    <div className="flex flex-col anim-fade-up" style={{ gap: 16 }}>
      <Card className="flex items-center" style={{ padding: '16px 20px', gap: 16 }}>
        <Avatar name={employee.name} id={employee.id} url={employee.avatarUrl} size={44} />
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-.4px' }}>
            {employee.nameInstr ? `1-1 с ${employee.nameInstr}` : `1-1 · ${employee.name}`}
          </div>
          <div className="flex items-center" style={{ gap: 8, marginTop: 2 }}>
            <span style={{ fontSize: 13, color: '#828B95' }}>
              {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            {employee.bitrixId && (
              <span className="rounded-pill" style={{ fontSize: 11, padding: '2px 8px', background: '#EAF3FF', color: '#0154C8' }}>
                из Битрикс24
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center rounded-pill" style={{ gap: 8, background: '#F6FAFB', padding: '8px 14px' }}>
          <span
            className="rounded-full"
            style={{
              width: 7, height: 7,
              background: running ? '#1BCE7B' : '#FAA72C',
              animation: 'dotPulse 1.6s ease-in-out infinite',
            }}
          />
          <span className="tabular-nums" style={{ fontSize: 15, fontWeight: 500 }}>{fmt(secs)}</span>
        </div>
        <Button variant="secondary" onClick={() => setRunning(r => !r)}>
          {running ? 'Пауза' : 'Продолжить'}
        </Button>
        <Button onClick={finish} disabled={finishing}>
          {finishing ? 'Завершаем…' : 'Завершить'}
        </Button>
      </Card>

      <div className="grid items-start" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card style={{ padding: 20 }}>
          <div className="flex items-center justify-between flex-wrap" style={{ gap: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Повестка</div>
            <div style={{ fontSize: 12, color: '#828B95' }}>
              {total > 0 ? `${done} из ${total} · потяните, чтобы поменять порядок` : 'Пока пусто'}
            </div>
          </div>
          <div style={{ height: 4, borderRadius: 4, background: '#F0F4F7', margin: '12px 0 14px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: '#1BCE7B',
                width: total > 0 ? `${(done / total) * 100}%` : '0%',
                transition: 'width .5s cubic-bezier(.22,1,.36,1)',
              }}
            />
          </div>

          <div className="flex flex-col" style={{ gap: 8 }}>
            {activeItems.map(item => (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDraggedId(item.id)}
                onDragOver={e => { e.preventDefault(); setOverId(item.id) }}
                onDragLeave={() => setOverId(cur => (cur === item.id ? null : cur))}
                onDrop={e => handleDrop(e, item.id)}
                onDragEnd={() => { setDraggedId(null); setOverId(null) }}
                className="flex items-start transition-[border-color,opacity]"
                style={{
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 12,
                  cursor: 'grab',
                  border: overId === item.id && draggedId !== item.id ? '1px solid #0075FF' : '1px solid #F0F0F0',
                  opacity: draggedId === item.id ? .45 : 1,
                  transitionDuration: '.2s',
                }}
              >
                <span className="flex flex-col flex-none" style={{ gap: 3, paddingTop: 5 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ width: 12, height: 2, borderRadius: 1, background: '#C9D3DC' }} />
                  ))}
                </span>
                <div style={{ paddingTop: 1 }}>
                  <SpecCheckbox checked={false} onChange={() => toggleItem(item)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 14, overflowWrap: 'break-word' }}>{item.content}</div>
                  <div style={{ fontSize: 12, color: CATEGORY_META[item.category].color, marginTop: 2 }}>
                    {CATEGORY_META[item.category].label}
                  </div>
                </div>
              </div>
            ))}
            {discussedItems.map(item => (
              <div
                key={item.id}
                className="flex items-start"
                style={{
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: '#F8FBFF',
                  border: '1px solid #EAF3FF',
                }}
              >
                <div style={{ paddingTop: 1, marginLeft: 22 }}>
                  <SpecCheckbox checked onChange={() => toggleItem(item)} color="#1BCE7B" />
                </div>
                <div className="flex-1 min-w-0">
                  <span style={{ fontSize: 14, color: '#A5AEB8', textDecoration: 'line-through', overflowWrap: 'break-word' }}>
                    {item.content}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={addItem} className="flex" style={{ gap: 8, marginTop: 12 }}>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Добавить пункт повестки"
              className="input-spec"
              style={{ height: 40, borderRadius: 10, fontSize: 14 }}
            />
            <Button type="submit" variant="secondary" disabled={!draft.trim()}>Добавить</Button>
          </form>
        </Card>

        <div className="flex flex-col" style={{ gap: 16 }}>
          <Card style={{ padding: 20 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Заметки встречи</div>
              <div style={{ fontSize: 12, color: '#A5AEB8' }}>{saved ? 'Сохранено' : 'Сохраняем…'}</div>
            </div>
            <textarea
              value={notes}
              onChange={e => handleNotes(e.target.value)}
              placeholder="Что обсудили, о чём договорились…"
              className="input-spec"
              style={{ minHeight: 190, height: 'auto', padding: 13, borderRadius: 12, fontSize: 14, lineHeight: 1.6, resize: 'vertical' }}
            />
          </Card>

          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Как настроение?</div>
            <div className="flex" style={{ gap: 8 }}>
              {[1, 2, 3, 4, 5].map(v => {
                const active = mood === v
                const color = moodColor(v)
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMood(cur => (cur === v ? 0 : v))}
                    className="flex-1 transition-[background,border-color,transform,color]"
                    style={{
                      height: 52,
                      borderRadius: 12,
                      fontSize: 16,
                      fontWeight: 600,
                      border: active ? `1px solid ${color}` : '1px solid #F0F0F0',
                      background: active ? color : '#fff',
                      color: active ? '#fff' : '#828B95',
                      transform: active ? 'scale(1.04)' : 'scale(1)',
                      transitionDuration: '.2s',
                      transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)',
                    }}
                  >
                    {v}
                  </button>
                )
              })}
            </div>
            {mood > 0 && (
              <div className="anim-fade-up" style={{ fontSize: 12, color: '#A5AEB8', marginTop: 10, animationDuration: '.3s' }}>
                Оценка попадёт в пульс сотрудника
              </div>
            )}
          </Card>

          {secs === 0 && total === 0 && (
            <div style={{ fontSize: 12, color: '#A5AEB8', padding: '0 4px' }}>
              Повестка пуста — добавьте темы или начните с открытого вопроса
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
