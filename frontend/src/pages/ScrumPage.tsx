import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { scrumApi, Employee, ScrumNote, ScrumTab } from '../api/client'
import { useShell } from '../layout/AppShell'
import { Avatar, Button, Card, Pill, formatDateRuFull } from '../ui'
import { useToast } from '../ui/toast'

function PeoplePicker({ selected, onToggle }: { selected: number[]; onToggle: (id: number) => void }) {
  const { employees } = useShell()
  if (employees.length === 0) return null
  return (
    <div className="flex items-center flex-wrap" style={{ gap: 6 }}>
      <span style={{ fontSize: 12, color: '#A5AEB8', marginRight: 4 }}>Из чьих 1-1:</span>
      {employees.map(e => {
        const active = selected.includes(e.id)
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => onToggle(e.id)}
            title={e.name}
            className="rounded-full transition-all"
            style={{
              padding: 2,
              border: active ? '2px solid #0075FF' : '2px solid transparent',
              opacity: active ? 1 : .45,
              transform: active ? 'scale(1.05)' : 'scale(1)',
              transitionDuration: '.2s',
            }}
          >
            <Avatar name={e.name} id={e.id} url={e.avatarUrl} size={26} />
          </button>
        )
      })}
    </div>
  )
}

function AvatarStack({ ids, employees }: { ids: number[]; employees: Employee[] }) {
  const navigate = useNavigate()
  const people = ids.map(id => employees.find(e => e.id === id)).filter(Boolean) as Employee[]
  if (people.length === 0) return null
  return (
    <div className="flex items-center ml-auto" style={{ gap: 8 }}>
      <span style={{ fontSize: 12, color: '#A5AEB8' }}>
        Из 1-1 с {people.length} сотр.
      </span>
      <div className="flex">
        {people.map(p => (
          <button
            key={p.id}
            onClick={() => navigate(`/employees/${p.id}`)}
            title={p.name}
            className="rounded-full transition-transform hover:-translate-y-[2px]"
            style={{ border: '2px solid #fff', marginLeft: -7, transitionDuration: '.2s' }}
          >
            <Avatar name={p.name} id={p.id} url={p.avatarUrl} size={24} />
          </button>
        ))}
      </div>
    </div>
  )
}

const TABS: { key: ScrumTab; label: string; hint: string; color: string }[] = [
  { key: 'sos', label: 'Скрам над скрамом', hint: 'Что вынесли из 1-1 на уровень команды', color: '#0075FF' },
  { key: 'topics', label: 'Общие темы', hint: 'Повторяется у нескольких человек', color: '#FAA72C' },
  { key: 'decisions', label: 'Решения', hint: 'Что решили и кому сказали', color: '#1BCE7B' },
]

function NoteCard({ note, index, employees, onSaved }: {
  note: ScrumNote
  index: number
  employees: Employee[]
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(note.content)
  const [people, setPeople] = useState<number[]>(note.people)
  const [saving, setSaving] = useState(false)
  const tab = TABS.find(t => t.key === note.tab) ?? TABS[0]

  const save = async () => {
    if (!content.trim()) return
    setSaving(true)
    try {
      await scrumApi.update(note.id, { content: content.trim(), people })
      setEditing(false)
      onSaved()
    } catch (e) {
      console.error('Failed to update note', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      className="anim-fade-up group transition-[border-color,box-shadow] duration-200 hover:border-hover-border hover:shadow-[0_8px_22px_rgba(16,42,77,.06)]"
      style={{ padding: '18px 20px', animationDuration: '.5s', animationDelay: `${index * 0.07}s` }}
    >
      <div className="flex flex-col" style={{ gap: 12 }}>
        <div className="flex items-center" style={{ gap: 10 }}>
          <Pill color={tab.color}>{tab.label}</Pill>
          <span style={{ fontSize: 12, color: '#828B95' }}>{formatDateRuFull(note.date)}</span>
          {!editing && <AvatarStack ids={note.people} employees={employees} />}
          {!editing && (
            <button
              onClick={() => { setEditing(true); setContent(note.content); setPeople(note.people) }}
              className={`opacity-0 group-hover:opacity-100 transition-opacity ${note.people.length === 0 ? 'ml-auto' : ''}`}
              style={{ fontSize: 12, fontWeight: 500, color: '#0154C8' }}
            >
              Изменить
            </button>
          )}
        </div>
        {editing ? (
          <div className="flex flex-col" style={{ gap: 10 }}>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              className="input-spec"
              style={{ height: 'auto', padding: 13, borderRadius: 12, fontSize: 14, lineHeight: 1.6, resize: 'vertical' }}
              autoFocus
            />
            <PeoplePicker
              selected={people}
              onToggle={id => setPeople(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])}
            />
            <div className="flex justify-end" style={{ gap: 8 }}>
              <Button variant="secondary" onClick={() => setEditing(false)}>Отмена</Button>
              <Button onClick={save} disabled={saving || !content.trim()}>Сохранить</Button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', textWrap: 'pretty' }}>
            {note.content}
          </div>
        )}
      </div>
    </Card>
  )
}

export default function ScrumPage() {
  const { scrumNotes, employees, reload } = useShell()
  const [tab, setTab] = useState<ScrumTab>('sos')
  const [draft, setDraft] = useState('')
  const [draftPeople, setDraftPeople] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const byTab = useMemo(() => {
    const map: Record<ScrumTab, ScrumNote[]> = { sos: [], topics: [], decisions: [] }
    for (const n of scrumNotes) {
      ;(map[n.tab] ?? map.sos).push(n)
    }
    return map
  }, [scrumNotes])

  const active = TABS.find(t => t.key === tab)!
  const notes = byTab[tab]

  const submit = async () => {
    if (!draft.trim()) return
    setSaving(true)
    try {
      await scrumApi.create({
        content: draft.trim(),
        tab,
        date: new Date().toISOString().split('T')[0],
        people: draftPeople,
      })
      setDraft('')
      setDraftPeople([])
      toast('Записано')
      await reload()
    } catch (e) {
      console.error('Failed to create note', e)
    } finally {
      setSaving(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit()
  }

  return (
    <div className="flex flex-col" style={{ gap: 20, maxWidth: 900 }}>
      <div className="flex flex-col anim-fade-up" style={{ gap: 6 }}>
        <div className="eyebrow">Уровень команды</div>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-.8px' }}>Командные заметки</div>
      </div>

      <div className="flex flex-col" style={{ gap: 8 }}>
        <div className="flex" style={{ padding: 4, background: '#EEF3F7', borderRadius: 12, gap: 4, width: 'fit-content' }}>
          {TABS.map(t => {
            const isActive = t.key === tab
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex items-center transition-all"
                style={{
                  gap: 7,
                  height: 34,
                  padding: '0 14px',
                  borderRadius: 9,
                  fontSize: 14,
                  background: isActive ? '#fff' : 'transparent',
                  color: isActive ? '#333' : '#828B95',
                  fontWeight: isActive ? 500 : 400,
                  boxShadow: isActive ? '0 1px 3px rgba(16,42,77,.06)' : 'none',
                  transitionDuration: '.2s',
                }}
              >
                {t.label}
                <span
                  className="rounded-pill"
                  style={{
                    fontSize: 11,
                    padding: '2px 7px',
                    background: isActive ? '#DCEBFF' : '#F4F7FA',
                    color: isActive ? '#0154C8' : '#A5AEB8',
                  }}
                >
                  {byTab[t.key].length}
                </span>
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: 13, color: '#828B95' }}>{active.hint}</div>
      </div>

      <Card style={{ padding: 18 }}>
        <div className="flex flex-col" style={{ gap: 12 }}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Что вынести на уровень команды?"
            className="input-spec"
            style={{ minHeight: 74, height: 'auto', padding: 13, borderRadius: 12, fontSize: 14, lineHeight: 1.6, resize: 'vertical' }}
          />
          <PeoplePicker
            selected={draftPeople}
            onToggle={id => setDraftPeople(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])}
          />
          <div className="flex items-center" style={{ gap: 12 }}>
            <Button onClick={submit} disabled={saving || !draft.trim()} style={{ height: 38 }}>
              {saving ? 'Записываем…' : 'Записать'}
            </Button>
            <span style={{ fontSize: 12, color: '#A5AEB8' }}>Заметка видна только вам · ⌘+Enter</span>
          </div>
        </div>
      </Card>

      {notes.length === 0 ? (
        <Card style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#828B95' }}>В этом разделе пока пусто</div>
        </Card>
      ) : (
        <div className="flex flex-col" style={{ gap: 12 }}>
          {notes.map((n, i) => (
            <NoteCard key={n.id} note={n} index={i} employees={employees} onSaved={reload} />
          ))}
        </div>
      )}
    </div>
  )
}
