import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { employeesApi, agendaApi, meetingsApi, Employee, AgendaItem, Meeting, BitrixUserPreview } from '../api/client'
import { useShell } from '../layout/AppShell'
import { Avatar, Button, Card, Modal, MoodDot, Spinner, formatDateRu, moodColor, plural } from '../ui'
import { useToast } from '../ui/toast'
import AgendaList from '../components/AgendaList'

function tenure(createdAt: string): string {
  const start = new Date(createdAt)
  const months = Math.max(0, Math.floor((Date.now() - start.getTime()) / (30.44 * 86400000)))
  const y = Math.floor(months / 12)
  const m = months % 12
  const parts: string[] = []
  if (y > 0) parts.push(`${y} ${plural(y, 'год', 'года', 'лет')}`)
  if (m > 0) parts.push(`${m} ${plural(m, 'месяц', 'месяца', 'месяцев')}`)
  if (parts.length === 0) return 'в карточках меньше месяца'
  return `в карточках ${parts.join(' ')}`
}

function PulseChart({ meetings }: { meetings: Meeting[] }) {
  // последние 8 встреч, старые слева
  const last = [...meetings].slice(0, 8).reverse()
  const withMood = last.filter(m => m.mood != null)
  const avg = withMood.length
    ? (withMood.reduce((s, m) => s + (m.mood as number), 0) / withMood.length).toFixed(1).replace('.', ',')
    : null

  return (
    <Card style={{ padding: 20 }}>
      <div className="flex items-center justify-between flex-wrap" style={{ gap: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Пульс за {last.length || 8} встреч</div>
        <div style={{ fontSize: 13, color: '#828B95' }}>{avg ? `Среднее ${avg} из 5` : 'Оценок пока нет'}</div>
      </div>
      {last.length === 0 ? (
        <div style={{ fontSize: 13, color: '#A5AEB8', marginTop: 14 }}>
          Появится после первой встречи с оценкой настроения
        </div>
      ) : (
        <div className="flex items-end" style={{ gap: 10, height: 150, marginTop: 16 }}>
          {last.map((m, i) => (
            <div key={m.id} className="flex-1 flex flex-col items-center" style={{ gap: 6, height: '100%' }}>
              <div className="flex-1 flex items-end w-full">
                <div
                  className="w-full"
                  style={{
                    height: m.mood ? `${(m.mood / 5) * 100}%` : '8%',
                    borderRadius: 6,
                    background: m.mood ? moodColor(m.mood) : '#EEF3F7',
                    transition: 'height .9s cubic-bezier(.22,1,.36,1)',
                  }}
                  title={m.mood ? `${formatDateRu(m.date)}: ${m.mood} из 5` : `${formatDateRu(m.date)}: без оценки`}
                />
              </div>
              <div style={{ fontSize: 11, color: '#A5AEB8' }}>н{i + 1}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function MeetingRow({ meeting }: { meeting: Meeting }) {
  const [open, setOpen] = useState(false)
  const topics = meeting.discussedTopics.length > 0 ? meeting.discussedTopics.join(' · ') : meeting.notes.split('\n')[0]
  return (
    <div>
      <div
        onClick={() => setOpen(o => !o)}
        className="grid items-center cursor-pointer transition-colors"
        style={{
          gridTemplateColumns: 'minmax(72px,90px) minmax(0,1fr) auto 10px',
          gap: 10,
          padding: '11px 12px',
          margin: '0 -12px',
          borderRadius: 10,
          transitionDuration: '.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#F8FBFF' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ fontSize: 13, color: '#828B95' }}>{formatDateRu(meeting.date)}</span>
        <span className="truncate" style={{ fontSize: 13, color: '#333', minWidth: 0 }}>{topics || '—'}</span>
        <span style={{ fontSize: 13, color: '#828B95' }}>{meeting.duration ? `${meeting.duration} мин` : ''}</span>
        <MoodDot mood={meeting.mood} />
      </div>
      {open && (
        <div
          className="anim-fade-up"
          style={{
            margin: '2px 0 8px',
            padding: '12px 14px',
            background: '#F8FBFF',
            border: '1px solid #EAF3FF',
            borderRadius: 12,
            fontSize: 13,
            lineHeight: 1.6,
            color: '#525C69',
            whiteSpace: 'pre-wrap',
            animationDuration: '.3s',
          }}
        >
          {meeting.notes || 'Без заметок'}
        </div>
      )}
    </div>
  )
}

const WEEKDAYS_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']

function formatNextRu(value: string): string {
  const d = new Date(value.replace(' ', 'T'))
  if (isNaN(d.getTime())) return value
  return `${WEEKDAYS_FULL[d.getDay()]}, ${formatDateRu(value.slice(0, 10))}, ${value.slice(11, 16)}`
}

function Bitrix24Block({ employee, onChanged }: { employee: Employee; onChanged: () => void }) {
  const [configured, setConfigured] = useState(false)
  const [on, setOn] = useState(() => localStorage.getItem(`b24-series-${employee.id}`) !== 'off')
  const [linkId, setLinkId] = useState('')
  const [preview, setPreview] = useState<BitrixUserPreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncProg, setSyncProg] = useState(0)
  const [journal, setJournal] = useState<{ text: string; color: string }[]>([])
  const toast = useToast()

  useEffect(() => {
    employeesApi.bitrixStatus().then(res => setConfigured(res.data.configured)).catch(() => {})
  }, [])

  const toggle = () => {
    const next = !on
    setOn(next)
    localStorage.setItem(`b24-series-${employee.id}`, next ? 'on' : 'off')
  }

  const runSync = async () => {
    setSyncing(true)
    setSyncProg(0)
    const ticker = setInterval(() => setSyncProg(p => Math.min(p + 12, 90)), 130)
    try {
      const res = await employeesApi.syncCalendar()
      clearInterval(ticker)
      setSyncProg(100)
      const d = res.data
      const mine = d.matched.find(m => m.employeeId === employee.id)
      const entries: { text: string; color: string }[] = []
      if (mine) {
        entries.push({ text: `Найдена серия «${mine.eventName}»`, color: '#1BCE7B' })
      } else {
        entries.push({ text: 'Серия 1-1 для сотрудника в календаре не найдена', color: '#FAA72C' })
      }
      entries.push({ text: `Привязано встреч: ${d.matched.length}`, color: '#0075FF' })
      d.unmatchedEvents.slice(0, 2).forEach(n => entries.push({ text: `Без пары: «${n}»`, color: '#A5AEB8' }))
      setJournal(entries.slice(0, 4))
      toast('Синхронизировано с Битрикс24')
      onChanged()
    } catch {
      clearInterval(ticker)
      setJournal([{ text: 'Не удалось получить календарь Битрикс24', color: '#FF5752' }])
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncProg(0), 600)
    }
  }

  const lookup = async () => {
    const id = parseInt(linkId)
    if (!id) return
    setBusy(true)
    setError('')
    setPreview(null)
    try {
      const res = await employeesApi.bitrixPreview(id)
      setPreview(res.data)
    } catch (err: any) {
      setError(err.response?.status === 409 ? 'Уже привязан к другому сотруднику' : 'Не нашли пользователя')
    } finally {
      setBusy(false)
    }
  }

  const link = async () => {
    const id = parseInt(linkId)
    if (!id || !preview) return
    setBusy(true)
    try {
      await employeesApi.update(employee.id, { bitrixId: id, avatarUrl: preview.avatarUrl })
      toast('Сотрудник привязан к Битрикс24')
      setLinkId('')
      setPreview(null)
      onChanged()
    } catch {
      setError('Не удалось привязать')
    } finally {
      setBusy(false)
    }
  }

  const unlink = async () => {
    setBusy(true)
    try {
      await employeesApi.update(employee.id, { bitrixId: null, avatarUrl: null })
      toast('Привязка к Битрикс24 удалена')
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center" style={{ padding: '18px 20px', borderBottom: '1px solid #F7F7F7', gap: 12 }}>
        <div
          className="grid place-items-center flex-none text-white font-b24"
          style={{ width: 34, height: 34, borderRadius: 10, background: '#0075FF', fontWeight: 800, fontSize: 13 }}
        >
          Б24
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 14, fontWeight: 600 }}>Регулярная встреча</div>
          <div style={{ fontSize: 12, color: '#828B95' }}>Календарь Битрикс24</div>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="rounded-pill flex-none"
          style={{ width: 38, height: 22, padding: 2, background: on ? '#0075FF' : '#DCE4EA', transition: 'background .22s' }}
        >
          <span
            className="block bg-white rounded-full"
            style={{
              width: 18, height: 18,
              boxShadow: '0 1px 3px rgba(0,0,0,.2)',
              transform: on ? 'translateX(16px)' : 'translateX(0)',
              transition: 'transform .22s cubic-bezier(.22,1,.36,1)',
            }}
          />
        </button>
      </div>
      <div className="flex flex-col transition-opacity" style={{ padding: '16px 20px', gap: 14, opacity: on ? 1 : .42, transitionDuration: '.25s', pointerEvents: on ? 'auto' : 'none' }}>
        {!configured ? (
          <div style={{ fontSize: 13, color: '#525C69', lineHeight: 1.6 }}>
            Вебхук Битрикс24 не настроен. Добавьте <code style={{ fontSize: 12 }}>BITRIX24_WEBHOOK_URL</code> в
            «.env» — и здесь появится синхронизация с календарём.
          </div>
        ) : (
          <>
            <div className="flex items-center" style={{ gap: 8 }}>
              <span
                className="rounded-full flex-none"
                style={{
                  width: 7, height: 7,
                  background: syncing ? '#FAA72C' : employee.meetingRule ? '#1BCE7B' : '#D5DDE5',
                  animation: 'dotPulse 2.2s ease-in-out infinite',
                }}
              />
              <span style={{ fontSize: 13, color: '#525C69' }}>
                {syncing ? 'Синхронизация…' : employee.meetingRule ? 'Серия найдена в календаре' : 'Серия пока не привязана'}
              </span>
            </div>
            {employee.meetingRule && (
              <div style={{ fontSize: 13, color: '#333' }}>{employee.meetingRule}</div>
            )}
            {employee.nextMeetingAt && (
              <div style={{ fontSize: 12, color: '#A5AEB8' }}>
                Следующее событие: {formatNextRu(employee.nextMeetingAt)}
              </div>
            )}
            <div style={{ height: 3, borderRadius: 3, background: '#F0F4F7', overflow: 'hidden', opacity: syncing || syncProg > 0 ? 1 : 0, transition: 'opacity .3s' }}>
              <div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg,#0075FF,#2FC6F6)',
                  width: `${syncProg}%`,
                  transition: 'width .35s linear',
                }}
              />
            </div>
            <Button variant="secondary" onClick={runSync} disabled={syncing}>
              {syncing ? (
                <span className="flex items-center justify-center" style={{ gap: 8 }}>
                  <Spinner /> Синхронизируем…
                </span>
              ) : 'Синхронизировать сейчас'}
            </Button>
            {journal.length > 0 && (
              <div className="flex flex-col" style={{ gap: 8, borderTop: '1px solid #F7F7F7', paddingTop: 12 }}>
                {journal.map((entry, i) => (
                  <div key={i} className="flex items-center anim-fade-up" style={{ gap: 8, animationDuration: '.3s' }}>
                    <span className="rounded-full flex-none" style={{ width: 6, height: 6, background: entry.color }} />
                    <span style={{ fontSize: 12, color: '#525C69' }}>{entry.text}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderTop: '1px solid #F7F7F7', paddingTop: 12 }} className="flex flex-col gap-3">
              {employee.bitrixId ? (
                <div className="flex items-center justify-between" style={{ gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#A5AEB8' }}>Профиль привязан · ID {employee.bitrixId}</span>
                  <button
                    onClick={unlink}
                    disabled={busy}
                    className="transition-opacity hover:opacity-70"
                    style={{ fontSize: 12, fontWeight: 500, color: '#828B95' }}
                  >
                    Отвязать
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: '#A5AEB8' }}>
                    Привяжите профиль по ID из Битрикс24 — подтянем имя, фото и должность.
                  </div>
                  <div className="flex" style={{ gap: 8 }}>
                    <input
                      type="number"
                      value={linkId}
                      onChange={e => { setLinkId(e.target.value); setPreview(null); setError('') }}
                      placeholder="ID"
                      className="input-spec"
                      style={{ height: 38, fontSize: 13 }}
                      min={1}
                    />
                    <Button variant="secondary" onClick={lookup} disabled={!linkId || busy}>
                      {busy && !preview ? <Spinner /> : 'Найти'}
                    </Button>
                  </div>
                  {error && <div style={{ fontSize: 12, color: '#FF5752' }}>{error}</div>}
                  {preview && (
                    <div className="flex items-center anim-fade-up" style={{ gap: 10, animationDuration: '.3s' }}>
                      <Avatar name={preview.name} id={parseInt(linkId) || 0} url={preview.avatarUrl} size={30} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate" style={{ fontSize: 13, fontWeight: 500 }}>{preview.name}</div>
                        {preview.position && <div className="truncate" style={{ fontSize: 12, color: '#828B95' }}>{preview.position}</div>}
                      </div>
                      <Button onClick={link} disabled={busy}>Привязать</Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  )
}

export default function EmployeePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { reload: reloadShell } = useShell()
  const toast = useToast()
  const employeeId = parseInt(id || '0')

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [agenda, setAgenda] = useState<AgendaItem[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [showEdit, setShowEdit] = useState(false)

  const loadData = async () => {
    try {
      const [empRes, agendaRes, meetingsRes] = await Promise.all([
        employeesApi.get(employeeId),
        agendaApi.list(employeeId),
        meetingsApi.list(employeeId),
      ])
      setEmployee(empRes.data)
      setAgenda(agendaRes.data)
      setMeetings(meetingsRes.data)
    } catch (error) {
      console.error('Failed to load data', error)
      navigate('/')
    }
  }

  useEffect(() => {
    loadData()
  }, [employeeId])

  const openCount = useMemo(() => agenda.filter(a => !a.isDiscussed).length, [agenda])
  const important = useMemo(() => agenda.filter(a => a.isImportant), [agenda])

  if (!employee) return null

  return (
    <div className="flex flex-col anim-fade-up" style={{ gap: 18 }}>
      <Link
        to="/"
        className="transition-colors"
        style={{ fontSize: 13, color: '#828B95', width: 'fit-content' }}
        onMouseEnter={e => { (e.target as HTMLElement).style.color = '#0154C8' }}
        onMouseLeave={e => { (e.target as HTMLElement).style.color = '#828B95' }}
      >
        ← К команде
      </Link>

      <div className="flex items-center" style={{ gap: 16 }}>
        <div className="anim-pop-in">
          <Avatar name={employee.name} id={employee.id} url={employee.avatarUrl} size={64} />
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-.7px' }}>{employee.name}</div>
          <div style={{ fontSize: 14, color: '#828B95' }}>
            {[employee.position, tenure(employee.createdAt)].filter(Boolean).join(' · ')}
          </div>
        </div>
        <Button variant="secondary" onClick={() => setShowEdit(true)}>Редактировать</Button>
        <Button onClick={() => navigate(`/meeting/${employee.id}`)}>Начать встречу</Button>
      </div>

      <div className="grid items-start" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(300px,336px)', gap: 16 }}>
        <div className="flex flex-col" style={{ gap: 16 }}>
          <PulseChart meetings={meetings} />

          <Card style={{ padding: 20 }}>
            <div className="flex items-center justify-between flex-wrap" style={{ gap: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Повестка следующей встречи</div>
              <div style={{ fontSize: 13, color: '#828B95' }}>
                {openCount > 0
                  ? `${openCount} ${plural(openCount, 'пункт', 'пункта', 'пунктов')} к следующей встрече`
                  : 'Пока пусто'}
              </div>
            </div>
            <AgendaList
              employeeId={employeeId}
              items={agenda}
              onUpdate={() => { loadData(); reloadShell() }}
            />
          </Card>

          <Card style={{ padding: 20 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>История встреч</div>
              <span
                onClick={() => navigate('/history')}
                className="cursor-pointer transition-opacity hover:opacity-65"
                style={{ fontSize: 13, fontWeight: 500, color: '#0154C8' }}
              >
                Вся история
              </span>
            </div>
            {meetings.length === 0 ? (
              <div style={{ fontSize: 13, color: '#A5AEB8' }}>Встреч ещё не было</div>
            ) : (
              meetings.map(m => <MeetingRow key={m.id} meeting={m} />)
            )}
          </Card>
        </div>

        <div className="flex flex-col" style={{ gap: 16 }}>
          <Bitrix24Block employee={employee} onChanged={() => { loadData(); reloadShell() }} />

          <Card style={{ padding: 18 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Досье</div>
              <span
                onClick={() => setShowEdit(true)}
                className="cursor-pointer transition-opacity hover:opacity-65"
                style={{ fontSize: 12, fontWeight: 500, color: '#0154C8' }}
              >
                Изменить
              </span>
            </div>
            {employee.bio ? (
              <div style={{ fontSize: 13, lineHeight: 1.6, color: '#525C69', whiteSpace: 'pre-wrap' }}>{employee.bio}</div>
            ) : (
              <div style={{ fontSize: 13, color: '#A5AEB8' }}>
                Город, семья, хобби, сильные стороны — всё, что помогает вести 1-1.
              </div>
            )}
          </Card>

          {important.length > 0 && (
            <Card style={{ padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Важное</div>
              <div className="flex flex-col" style={{ gap: 8 }}>
                {important.map(item => (
                  <div key={item.id} className="flex items-start" style={{ gap: 8 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#FAA72C" style={{ marginTop: 3, flexShrink: 0 }}>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span style={{
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: item.isDiscussed ? '#A5AEB8' : '#333',
                      textDecoration: item.isDiscussed ? 'line-through' : 'none',
                    }}>
                      {item.content}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {showEdit && (
        <EditEmployeeModal
          employee={employee}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); loadData(); reloadShell(); toast('Сохранено') }}
          onDeleted={() => { reloadShell(); navigate('/') }}
        />
      )}
    </div>
  )
}

function EditEmployeeModal({ employee, onClose, onSaved, onDeleted }: {
  employee: Employee
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}) {
  const [name, setName] = useState(employee.name)
  const [nameInstr, setNameInstr] = useState(employee.nameInstr || '')
  const [position, setPosition] = useState(employee.position || '')
  const [bio, setBio] = useState(employee.bio || '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await employeesApi.update(employee.id, {
        name: name.trim(),
        nameInstr: nameInstr.trim() || null,
        position: position.trim() || undefined,
        bio: bio.trim() || undefined,
      })
      onSaved()
    } catch (error) {
      console.error('Failed to update employee', error)
      setSaving(false)
    }
  }

  const remove = async () => {
    setSaving(true)
    try {
      await employeesApi.delete(employee.id)
      onDeleted()
    } catch (error) {
      console.error('Failed to delete employee', error)
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={480}>
      <form onSubmit={save} className="flex flex-col" style={{ gap: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.5px' }}>Карточка сотрудника</div>
        <label className="flex flex-col" style={{ gap: 8 }}>
          <span style={{ fontSize: 13, color: '#525C69' }}>Имя и фамилия</span>
          <input value={name} onChange={e => setName(e.target.value)} className="input-spec" style={{ height: 40 }} required />
        </label>
        <label className="flex flex-col" style={{ gap: 8 }}>
          <span style={{ fontSize: 13, color: '#525C69' }}>Имя в творительном падеже — для «1-1 с …»</span>
          <input
            value={nameInstr}
            onChange={e => setNameInstr(e.target.value)}
            placeholder="Анной"
            className="input-spec"
            style={{ height: 40 }}
          />
        </label>
        <label className="flex flex-col" style={{ gap: 8 }}>
          <span style={{ fontSize: 13, color: '#525C69' }}>Роль</span>
          <input value={position} onChange={e => setPosition(e.target.value)} className="input-spec" style={{ height: 40 }} />
        </label>
        <label className="flex flex-col" style={{ gap: 8 }}>
          <span style={{ fontSize: 13, color: '#525C69' }}>Досье</span>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={5}
            placeholder="Город, семья, хобби, договорённости о развитии…"
            className="input-spec"
            style={{ height: 'auto', padding: 13, borderRadius: 12, fontSize: 14, lineHeight: 1.6, resize: 'vertical' }}
          />
        </label>
        <div className="flex items-center justify-between" style={{ gap: 8 }}>
          {confirmDelete ? (
            <span className="flex items-center" style={{ gap: 10, fontSize: 13 }}>
              <span style={{ color: '#525C69' }}>Точно удалить? Пропадёт вся история.</span>
              <button type="button" onClick={remove} disabled={saving} style={{ color: '#FF5752', fontWeight: 500 }}>Да, удалить</button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="transition-opacity hover:opacity-70"
              style={{ fontSize: 13, color: '#FF5752' }}
            >
              Удалить сотрудника
            </button>
          )}
          <div className="flex" style={{ gap: 8 }}>
            <Button type="button" variant="secondary" size="lg" onClick={onClose}>Отмена</Button>
            <Button type="submit" disabled={saving || !name.trim()}>Сохранить</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
