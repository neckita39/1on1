import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { employeesApi, BitrixUserPreview, Employee, GlobalMeeting } from '../api/client'
import { useShell } from '../layout/AppShell'
import { Avatar, Button, Card, Modal, tagBg, urgency, formatDateRu, moodColor, plural } from '../ui'
import { useToast } from '../ui/toast'

type Filter = 'all' | 'soon' | 'late'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Доброй ночи'
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

function Metric({ label, value, hint, color, progress, delay }: {
  label: string
  value: string
  hint: string
  color: string
  progress: number
  delay: number
}) {
  return (
    <Card className="anim-fade-up" style={{ padding: '18px 20px', animationDuration: '.55s', animationDelay: `${delay}s` }}>
      <div style={{ fontSize: 13, color: '#525C69' }}>{label}</div>
      <div className="flex items-baseline" style={{ gap: 8, marginTop: 6 }}>
        <div className="tabular-nums" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-1px' }}>{value}</div>
        <div style={{ fontSize: 13, color }}>{hint}</div>
      </div>
      <div style={{ height: 5, borderRadius: 4, background: '#F0F4F7', marginTop: 12, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            borderRadius: 4,
            background: color,
            width: `${Math.round(progress * 100)}%`,
            transition: 'width 1.1s cubic-bezier(.22,1,.36,1)',
          }}
        />
      </div>
    </Card>
  )
}

function PulseSparkline({ meetings }: { meetings: GlobalMeeting[] }) {
  // последние 8 встреч, старые слева
  const last = meetings.slice(0, 8).reverse()
  const bars = Array.from({ length: 8 }, (_, i) => last[i - (8 - last.length)] ?? null)
  return (
    <div className="flex items-end" style={{ gap: 4, height: 44 }}>
      {bars.map((m, i) => {
        const mood = m?.mood ?? null
        return (
          <div
            key={i}
            className="flex-1"
            style={{
              height: mood ? `${(mood / 5) * 100}%` : '14%',
              borderRadius: 3,
              background: mood ? moodColor(mood) : '#EEF3F7',
              transition: 'height .8s cubic-bezier(.22,1,.36,1)',
            }}
          />
        )
      })}
    </div>
  )
}

function EmployeeCardNew({ employee, meetings, index }: {
  employee: Employee
  meetings: GlobalMeeting[]
  index: number
}) {
  const navigate = useNavigate()
  const u = urgency(employee.lastMeetingDate)
  return (
    <Card
      hover
      onClick={() => navigate(`/employees/${employee.id}`)}
      className="flex flex-col anim-fade-up"
      style={{ padding: 18, gap: 15, animationDuration: '.55s', animationDelay: `${index * 0.06}s` }}
    >
      <div className="flex items-center" style={{ gap: 12 }}>
        <div className="relative flex-none">
          <Avatar name={employee.name} id={employee.id} url={employee.avatarUrl} size={42} />
          <span
            className="absolute rounded-full"
            style={{ width: 12, height: 12, right: -1, bottom: -1, border: '2px solid #fff', background: u.color }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontSize: 15, fontWeight: 500 }}>{employee.name}</div>
          <div className="truncate" style={{ fontSize: 13, color: '#828B95' }}>{employee.position || '—'}</div>
        </div>
        <span
          className="rounded-pill flex-none"
          style={{ fontSize: 12, padding: '4px 10px', background: tagBg(u.color), color: u.color }}
        >
          {u.label}
        </span>
      </div>
      <PulseSparkline meetings={meetings} />
      <div
        className="flex items-center justify-between"
        style={{ borderTop: '1px solid #F7F7F7', paddingTop: 12 }}
      >
        <span style={{ fontSize: 12, color: '#828B95' }}>
          {employee.lastMeetingDate ? `Последняя: ${formatDateRu(employee.lastMeetingDate)}` : 'Встреч ещё не было'}
        </span>
        <span
          onClick={e => { e.stopPropagation(); navigate(`/meeting/${employee.id}`) }}
          className="transition-opacity hover:opacity-65"
          style={{ fontSize: 13, fontWeight: 500, color: '#0154C8' }}
        >
          Начать 1-1
        </span>
      </div>
    </Card>
  )
}

export default function HomePage() {
  const { employees, meetings, loaded, reload } = useShell()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const sorted = useMemo(
    () => [...employees].sort((a, b) => urgency(a.lastMeetingDate).due - urgency(b.lastMeetingDate).due),
    [employees]
  )

  const byEmployee = useMemo(() => {
    const map = new Map<number, GlobalMeeting[]>()
    for (const m of meetings) {
      const list = map.get(m.employeeId) ?? []
      list.push(m)
      map.set(m.employeeId, list)
    }
    return map
  }, [meetings])

  const weekMeetings = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000
    return meetings.filter(m => new Date(m.date + 'T00:00:00').getTime() >= weekAgo).length
  }, [meetings])

  const openAgenda = useMemo(() => employees.reduce((s, e) => s + e.agendaCount, 0), [employees])

  const avgMood = useMemo(() => {
    const withMood = meetings.filter(m => m.mood != null).slice(0, 30)
    if (withMood.length === 0) return null
    return withMood.reduce((s, m) => s + (m.mood as number), 0) / withMood.length
  }, [meetings])

  const lateCount = sorted.filter(e => urgency(e.lastMeetingDate).due < 0).length

  const filtered = sorted.filter(e => {
    const due = urgency(e.lastMeetingDate).due
    if (filter === 'soon' && !(due >= 0 && due <= 2)) return false
    if (filter === 'late' && due >= 0) return false
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      return e.name.toLowerCase().includes(q) || (e.position ?? '').toLowerCase().includes(q)
    }
    return true
  })

  const chips: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Все' },
    { key: 'soon', label: 'Скоро' },
    { key: 'late', label: 'Просрочено' },
  ]

  return (
    <div className="flex flex-col" style={{ gap: 24 }}>
      <div className="flex items-end justify-between anim-fade-up" style={{ gap: 16 }}>
        <div className="flex flex-col" style={{ gap: 6 }}>
          <div className="eyebrow">Ваша команда</div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-.8px' }}>{greeting()}!</div>
        </div>
        <Button onClick={() => setShowAdd(true)}>Добавить сотрудника</Button>
      </div>

      <div className="grid grid-cols-3" style={{ gap: 16 }}>
        <Metric
          label="Встреч на этой неделе"
          value={String(weekMeetings)}
          hint={`из ${employees.length} 1-1`}
          color="#0075FF"
          progress={employees.length ? Math.min(weekMeetings / employees.length, 1) : 0}
          delay={0}
        />
        <Metric
          label="Открытых тем в повестках"
          value={String(openAgenda)}
          hint={lateCount > 0 ? `${lateCount} ${plural(lateCount, 'встреча просрочена', 'встречи просрочены', 'встреч просрочено')}` : 'всё по плану'}
          color="#FAA72C"
          progress={Math.min(openAgenda / 30, 1)}
          delay={0.07}
        />
        <Metric
          label="Средний пульс команды"
          value={avgMood ? avgMood.toFixed(1).replace('.', ',') : '—'}
          hint="из 5"
          color="#1BCE7B"
          progress={avgMood ? avgMood / 5 : 0}
          delay={0.14}
        />
      </div>

      <div className="flex items-center justify-between anim-fade-up" style={{ gap: 16, animationDelay: '.1s' }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Сотрудники</div>
        <div className="flex items-center" style={{ gap: 8 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск"
            className="input-spec"
            style={{ height: 30, width: 180, fontSize: 13, borderRadius: 512, padding: '0 13px' }}
          />
          {chips.map(c => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className="rounded-pill transition-colors"
              style={{
                height: 30,
                padding: '0 13px',
                fontSize: 13,
                border: filter === c.key ? '1px solid #0075FF' : '1px solid #E2E2E2',
                background: filter === c.key ? '#0075FF' : '#fff',
                color: filter === c.key ? '#fff' : '#525C69',
                transitionDuration: '.2s',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {loaded && filtered.length === 0 ? (
        <Card style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#828B95' }}>
            {employees.length === 0 ? 'Добавьте первого сотрудника — и начнём' : 'Никого не нашлось'}
          </div>
        </Card>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
          {filtered.map((e, i) => (
            <EmployeeCardNew key={e.id} employee={e} meetings={byEmployee.get(e.id) ?? []} index={i} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddEmployeeModal
          onClose={() => setShowAdd(false)}
          onAdded={async (id) => {
            setShowAdd(false)
            toast('Сотрудник добавлен')
            await reload()
            navigate(`/employees/${id}`)
          }}
        />
      )}
    </div>
  )
}

function AddEmployeeModal({ onClose, onAdded }: {
  onClose: () => void
  onAdded: (id: number) => void
}) {
  const [mode, setMode] = useState<'manual' | 'bitrix'>('manual')
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [bitrixOk, setBitrixOk] = useState(false)
  const [bitrixId, setBitrixId] = useState('')
  const [preview, setPreview] = useState<BitrixUserPreview | null>(null)
  const [looking, setLooking] = useState(false)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    employeesApi.bitrixStatus().then(res => setBitrixOk(res.data.configured)).catch(() => {})
  }, [])

  const lookup = async () => {
    const id = parseInt(bitrixId)
    if (!id) return
    setLooking(true)
    setError('')
    setPreview(null)
    try {
      const res = await employeesApi.bitrixPreview(id)
      setPreview(res.data)
      setName(res.data.name)
      setPosition(res.data.position || '')
    } catch (err: any) {
      setError(err.response?.status === 409 ? 'Этот сотрудник уже привязан' : 'Не нашли пользователя в Битрикс24')
    } finally {
      setLooking(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setAdding(true)
    try {
      const res = await employeesApi.create({
        name: name.trim(),
        position: position.trim() || undefined,
        ...(mode === 'bitrix' && preview ? {
          bitrixId: parseInt(bitrixId),
          avatarUrl: preview.avatarUrl || undefined,
        } : {}),
      })
      onAdded(res.data.id)
    } catch {
      setError('Не удалось добавить сотрудника')
      setAdding(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 18 }}>
        <div className="flex flex-col" style={{ gap: 6 }}>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.5px' }}>Добавить сотрудника</div>
          <div style={{ fontSize: 13, color: '#828B95' }}>
            {bitrixOk ? 'Вручную или по ID пользователя Битрикс24' : 'Имя и роль — остальное добавите в карточке'}
          </div>
        </div>

        {bitrixOk && (
          <div className="flex" style={{ padding: 4, background: '#EEF3F7', borderRadius: 12, gap: 4, width: 'fit-content' }}>
            {(['manual', 'bitrix'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError('') }}
                className="transition-colors"
                style={{
                  height: 34,
                  padding: '0 14px',
                  borderRadius: 9,
                  fontSize: 14,
                  background: mode === m ? '#fff' : 'transparent',
                  color: mode === m ? '#333' : '#828B95',
                  fontWeight: mode === m ? 500 : 400,
                  boxShadow: mode === m ? '0 1px 3px rgba(16,42,77,.06)' : 'none',
                  transitionDuration: '.2s',
                }}
              >
                {m === 'manual' ? 'Вручную' : 'Из Битрикс24'}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="flex flex-col" style={{ gap: 14 }}>
          {mode === 'bitrix' && bitrixOk && (
            <div className="flex flex-col" style={{ gap: 8 }}>
              <span style={{ fontSize: 13, color: '#525C69' }}>ID в Битрикс24</span>
              <div className="flex" style={{ gap: 8 }}>
                <input
                  type="number"
                  value={bitrixId}
                  onChange={e => { setBitrixId(e.target.value); setPreview(null); setError('') }}
                  className="input-spec"
                  style={{ height: 40 }}
                  min={1}
                  autoFocus
                />
                <Button type="button" onClick={lookup} disabled={!bitrixId || looking}>
                  {looking ? '…' : 'Найти'}
                </Button>
              </div>
              {preview && (
                <div className="flex items-center anim-fade-up" style={{ gap: 10, padding: 10, background: '#F8FBFF', borderRadius: 10, animationDuration: '.3s' }}>
                  <Avatar name={preview.name} id={parseInt(bitrixId) || 0} url={preview.avatarUrl} size={34} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{preview.name}</div>
                    {preview.position && <div style={{ fontSize: 12, color: '#828B95' }}>{preview.position}</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          <label className="flex flex-col" style={{ gap: 8 }}>
            <span style={{ fontSize: 13, color: '#525C69' }}>Имя и фамилия</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="input-spec"
              style={{ height: 40 }}
              autoFocus={mode === 'manual'}
              required
            />
          </label>
          <label className="flex flex-col" style={{ gap: 8 }}>
            <span style={{ fontSize: 13, color: '#525C69' }}>Роль</span>
            <input
              value={position}
              onChange={e => setPosition(e.target.value)}
              className="input-spec"
              style={{ height: 40 }}
            />
          </label>

          {error && <div style={{ fontSize: 13, color: '#FF5752' }}>{error}</div>}

          <div className="flex justify-end" style={{ gap: 8, marginTop: 4 }}>
            <Button type="button" variant="secondary" size="lg" onClick={onClose}>Отмена</Button>
            <Button type="submit" disabled={adding || !name.trim()}>
              {adding ? 'Добавляем…' : 'Добавить'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
