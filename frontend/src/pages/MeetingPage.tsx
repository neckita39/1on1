import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { agendaApi, employeesApi, meetingsApi, Employee, AgendaItem } from '../api/client'
import { useShell } from '../layout/AppShell'
import { Avatar, Button, Card, SpecCheckbox, moodColor, useIsMobile } from '../ui'
import { useToast } from '../ui/toast'
import { CATEGORY_META, MoveButton, moveAgendaItem } from '../components/AgendaList'

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
  const isMobile = useIsMobile()

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [agenda, setAgenda] = useState<AgendaItem[]>([])
  const [notes, setNotes] = useState(() => localStorage.getItem(`meeting-draft-${employeeId}`) || '')
  const [saved, setSaved] = useState(true)
  const [mood, setMood] = useState(0)
  // встреча начинается только по кнопке; непустой черновик = продолжаем прерванную
  const [started, setStarted] = useState(() => !!localStorage.getItem(`meeting-draft-${employeeId}`))
  const [running, setRunning] = useState(false)
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
    // компонент не размонтируется при смене :id — сбрасываем состояние встречи
    const draft = localStorage.getItem(`meeting-draft-${employeeId}`) || ''
    setNotes(draft)
    setStarted(!!draft)
    setRunning(false)
    setSecs(0)
    setMood(0)
  }, [employeeId])

  useEffect(() => {
    if (!running || !started) return
    const t = setInterval(() => setSecs(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [running, started])

  const start = () => {
    setStarted(true)
    setRunning(true)
  }

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

  // пре-экран: встреча ещё не начата — ничего не тикает и не записывается
  if (!started) {
    return (
      <div className="flex flex-col anim-fade-up" style={{ gap: 20, maxWidth: 560, margin: '0 auto' }}>
        <Card className="flex flex-col items-center py-9 px-5 md:py-11 md:px-8" style={{ gap: 14 }}>
          <Avatar name={employee.name} id={employee.id} url={employee.avatarUrl} size={64} />
          <div className="flex flex-col items-center" style={{ gap: 4 }}>
            <div className="text-[21px] md:text-[24px] text-center" style={{ fontWeight: 600, letterSpacing: '-.6px' }}>
              {employee.nameInstr ? `1-1 с ${employee.nameInstr}` : `1-1 · ${employee.name}`}
            </div>
            {employee.meetingRule && (
              <div style={{ fontSize: 13, color: '#828B95' }}>{employee.meetingRule}</div>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#A5AEB8' }}>
            {total > 0
              ? `В повестке ${total} ${total === 1 ? 'пункт' : total < 5 ? 'пункта' : 'пунктов'}`
              : 'Повестка пуста — темы можно добавить по ходу'}
          </div>
          <div className="flex items-center max-md:w-full max-md:flex-col-reverse" style={{ gap: 10, marginTop: 8 }}>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate(`/employees/${employee.id}`)}
              className="max-md:w-full"
            >
              К карточке
            </Button>
            <Button size="lg" sheen onClick={start} className="max-md:w-full">Начать встречу</Button>
          </div>
        </Card>
        <div style={{ fontSize: 12, color: '#A5AEB8', textAlign: 'center' }}>
          Таймер запустится после старта. Встреча попадёт в историю только по кнопке «Завершить».
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col anim-fade-up" style={{ gap: 16 }}>
      {/* На телефоне шапка липнет к верху: таймер и «Завершить» всегда под рукой */}
      <Card
        className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-4 md:px-5 md:py-4 max-md:sticky max-md:top-0 max-md:z-40"
      >
        <div className="flex items-center md:contents" style={{ gap: 12 }}>
          <Avatar name={employee.name} id={employee.id} url={employee.avatarUrl} size={isMobile ? 40 : 44} />
          <div className="flex-1 min-w-0">
            <div className="text-[16px] md:text-[18px] truncate" style={{ fontWeight: 600, letterSpacing: '-.4px' }}>
              {employee.nameInstr ? `1-1 с ${employee.nameInstr}` : `1-1 · ${employee.name}`}
            </div>
            <div className="flex items-center" style={{ gap: 8, marginTop: 2 }}>
              <span className="truncate" style={{ fontSize: 13, color: '#828B95' }}>
                {new Date().toLocaleDateString('ru-RU', isMobile
                  ? { day: 'numeric', month: 'long' }
                  : { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
              {employee.bitrixId && (
                <span className="rounded-pill flex-none" style={{ fontSize: 11, padding: '2px 8px', background: '#EAF3FF', color: '#0154C8' }}>
                  из Битрикс24
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center rounded-pill flex-none" style={{ gap: 8, background: '#F6FAFB', padding: '8px 14px' }}>
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
        </div>
        <div className="flex md:contents" style={{ gap: 8 }}>
          <Button variant="secondary" onClick={() => setRunning(r => !r)} className="flex-1 md:flex-none">
            {running ? 'Пауза' : 'Продолжить'}
          </Button>
          <Button onClick={finish} disabled={finishing} className="flex-1 md:flex-none">
            {finishing ? 'Завершаем…' : 'Завершить'}
          </Button>
        </div>
      </Card>

      <div className="grid items-start gap-3 md:gap-4 md:grid-cols-2">
        <Card className="p-4 md:p-5">
          <div className="flex items-center justify-between flex-wrap" style={{ gap: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Повестка</div>
            <div style={{ fontSize: 12, color: '#828B95' }}>
              {total > 0
                ? isMobile
                  ? `${done} из ${total} обсудили`
                  : `${done} из ${total} · потяните, чтобы поменять порядок`
                : 'Пока пусто'}
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
            {isMobile && activeItems.map((item, idx) => (
              <div
                key={item.id}
                className="flex flex-col"
                style={{ gap: 8, padding: '12px 14px', borderRadius: 12, border: '1px solid #F0F0F0' }}
              >
                <div className="flex items-start" style={{ gap: 6 }}>
                  <SpecCheckbox checked={false} onChange={() => toggleItem(item)} />
                  <div className="flex-1 min-w-0" style={{ fontSize: 15, lineHeight: 1.45, overflowWrap: 'break-word', paddingTop: 9 }}>
                    {item.content}
                  </div>
                </div>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <span
                    className="rounded-pill"
                    style={{
                      fontSize: 12,
                      padding: '4px 10px',
                      color: CATEGORY_META[item.category].color,
                      background: CATEGORY_META[item.category].color + '18',
                    }}
                  >
                    {CATEGORY_META[item.category].label}
                  </span>
                  <span className="ml-auto flex items-center" style={{ gap: 4 }}>
                    <MoveButton
                      dir={-1}
                      disabled={idx === 0}
                      onClick={() => moveAgendaItem(employeeId, activeItems, item.id, -1).then(ok => { if (ok) load() })}
                    />
                    <MoveButton
                      dir={1}
                      disabled={idx === activeItems.length - 1}
                      onClick={() => moveAgendaItem(employeeId, activeItems, item.id, 1).then(ok => { if (ok) load() })}
                    />
                  </span>
                </div>
              </div>
            ))}
            {!isMobile && activeItems.map(item => (
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
                <div style={{ paddingTop: isMobile ? 0 : 1, marginLeft: isMobile ? 0 : 22 }}>
                  <SpecCheckbox checked onChange={() => toggleItem(item)} color="#1BCE7B" />
                </div>
                <div className="flex-1 min-w-0" style={{ paddingTop: isMobile ? 10 : 0 }}>
                  <span
                    className="text-[14px] max-md:text-[15px]"
                    style={{ color: '#A5AEB8', textDecoration: 'line-through', overflowWrap: 'break-word' }}
                  >
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
            <Button type="submit" variant="secondary" disabled={!draft.trim()} className="flex-none">Добавить</Button>
          </form>
        </Card>

        <div className="flex flex-col gap-3 md:gap-4">
          <Card className="p-4 md:p-5">
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

          <Card className="p-4 md:p-5">
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
