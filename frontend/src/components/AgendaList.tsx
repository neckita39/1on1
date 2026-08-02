import { useState } from 'react'
import { agendaApi, AgendaItem, AgendaCategory } from '../api/client'
import { Button, SpecCheckbox, useIsMobile } from '../ui'

interface Props {
  employeeId: number
  items: AgendaItem[]
  onUpdate: () => void
}

export const CATEGORY_META: Record<AgendaCategory, { label: string; color: string }> = {
  note: { label: 'Заметка', color: '#828B95' },
  positive: { label: 'Позитив', color: '#1BCE7B' },
  warning: { label: 'Замечание', color: '#FAA72C' },
  problem: { label: 'Проблема', color: '#FF5752' },
}

const CATEGORIES: AgendaCategory[] = ['note', 'positive', 'warning', 'problem']

function Star({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="tap-sm grid place-items-center flex-none transition-opacity hover:opacity-70" title="Важное" aria-label="Важное">
      <svg width="15" height="15" viewBox="0 0 24 24" fill={active ? '#FAA72C' : 'none'} stroke={active ? '#FAA72C' : '#C9D3DC'} strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </button>
  )
}

function DragHandle() {
  return (
    <span className="flex flex-col flex-none" style={{ gap: 3, cursor: 'grab' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: 12, height: 2, borderRadius: 1, background: '#C9D3DC' }} />
      ))}
    </span>
  )
}

// На тач-экране события HTML5 drag & drop не приходят — порядок меняем стрелками
export function MoveButton({ dir, disabled, onClick }: {
  dir: -1 | 1
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === -1 ? 'Выше в повестке' : 'Ниже в повестке'}
      className="tap-sm grid place-items-center flex-none rounded-[9px]"
      style={{ border: '1px solid #E2E2E2', background: '#fff', opacity: disabled ? .35 : 1 }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#525C69" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {dir === -1 ? <path d="M12 19V5M6 11l6-6 6 6" /> : <path d="M12 5v14M6 13l6 6 6-6" />}
      </svg>
    </button>
  )
}

export async function moveAgendaItem(
  employeeId: number,
  active: AgendaItem[],
  id: number,
  dir: -1 | 1
): Promise<boolean> {
  const from = active.findIndex(i => i.id === id)
  const to = from + dir
  if (from === -1 || to < 0 || to >= active.length) return false
  const reordered = [...active]
  const [moved] = reordered.splice(from, 1)
  reordered.splice(to, 0, moved)
  try {
    await agendaApi.reorder(employeeId, reordered.map(i => i.id))
    return true
  } catch (error) {
    console.error('Failed to reorder items', error)
    return false
  }
}

export default function AgendaList({ employeeId, items, onUpdate }: Props) {
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState<AgendaCategory>('note')
  const [adding, setAdding] = useState(false)
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [overId, setOverId] = useState<number | null>(null)
  const mobile = useIsMobile()

  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!newContent.trim()) return
    setAdding(true)
    try {
      await agendaApi.create(employeeId, newContent.trim(), newCategory)
      setNewContent('')
      setNewCategory('note')
      onUpdate()
    } catch (error) {
      console.error('Failed to add agenda item', error)
    } finally {
      setAdding(false)
    }
  }

  const toggle = (item: AgendaItem) =>
    agendaApi.update(item.id, { isDiscussed: !item.isDiscussed }).then(onUpdate).catch(console.error)

  const toggleImportant = (item: AgendaItem) =>
    agendaApi.update(item.id, { isImportant: !item.isImportant }).then(onUpdate).catch(console.error)

  const changeCategory = (item: AgendaItem, category: AgendaCategory) =>
    agendaApi.update(item.id, { category }).then(onUpdate).catch(console.error)

  const remove = (id: number) => agendaApi.delete(id).then(onUpdate).catch(console.error)

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault()
    setOverId(null)
    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null)
      return
    }
    const active = items.filter(i => !i.isDiscussed)
    const from = active.findIndex(i => i.id === draggedId)
    const to = active.findIndex(i => i.id === targetId)
    if (from === -1 || to === -1) {
      setDraggedId(null)
      return
    }
    const reordered = [...active]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    try {
      await agendaApi.reorder(employeeId, reordered.map(i => i.id))
      onUpdate()
    } catch (error) {
      console.error('Failed to reorder items', error)
    } finally {
      setDraggedId(null)
    }
  }

  const activeItems = items.filter(i => !i.isDiscussed)
  const discussedItems = items.filter(i => i.isDiscussed)

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <form onSubmit={handleAdd} className="flex flex-col" style={{ gap: 8 }}>
        <div className="flex" style={{ gap: 8 }}>
          <input
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder={mobile ? 'Новый пункт повестки' : 'Записать пункт, не дожидаясь встречи'}
            className="input-spec"
            style={{ height: 40, borderRadius: 10, fontSize: 14 }}
          />
          <Button type="submit" disabled={adding || !newContent.trim()} className="flex-none">Добавить</Button>
        </div>
        <div className="flex flex-wrap" style={{ gap: 6 }}>
          {CATEGORIES.map(cat => {
            const meta = CATEGORY_META[cat]
            const active = newCategory === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setNewCategory(cat)}
                className="rounded-pill flex items-center transition-colors tap-sm"
                style={{
                  gap: 6,
                  height: 26,
                  padding: '0 11px',
                  fontSize: 12,
                  border: active ? `1px solid ${meta.color}` : '1px solid #E2E2E2',
                  background: active ? meta.color + '18' : '#fff',
                  color: active ? meta.color : '#525C69',
                  transitionDuration: '.2s',
                }}
              >
                <span className="rounded-full" style={{ width: 6, height: 6, background: meta.color }} />
                {meta.label}
              </button>
            )
          })}
        </div>
      </form>

      {activeItems.length === 0 && discussedItems.length === 0 && (
        <div style={{ fontSize: 13, color: '#A5AEB8', padding: '4px 0' }}>Пока пусто — добавьте первую тему</div>
      )}

      {activeItems.map((item, idx) => {
        const meta = CATEGORY_META[item.category]
        const categorySelect = (
          <select
            value={item.category}
            onChange={e => changeCategory(item, e.target.value as AgendaCategory)}
            className="cursor-pointer cat-select"
            style={{
              fontSize: 12,
              color: meta.color,
              background: mobile ? meta.color + '18' : 'transparent',
              border: 'none',
              outline: 'none',
              padding: 0,
              appearance: 'none',
            }}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{CATEGORY_META[c].label}</option>
            ))}
          </select>
        )
        const star = <Star active={item.isImportant} onClick={() => toggleImportant(item)} />
        const removeBtn = (
          <button
            onClick={() => remove(item.id)}
            aria-label="Удалить пункт"
            className="transition-colors tap-sm"
            style={{ fontSize: 13, color: '#A5AEB8', transitionDuration: '.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#FF5752' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#A5AEB8' }}
          >
            ✕
          </button>
        )

        if (mobile) {
          return (
            <div
              key={item.id}
              className="flex flex-col"
              style={{
                gap: 10,
                padding: '12px 14px',
                borderRadius: 12,
                background: '#F8FBFF',
                border: '1px solid #F0F0F0',
              }}
            >
              <div className="flex items-start" style={{ gap: 6 }}>
                <SpecCheckbox checked={false} onChange={() => toggle(item)} />
                <div style={{ fontSize: 15, lineHeight: 1.45, overflowWrap: 'break-word', paddingTop: 9 }} className="flex-1 min-w-0">
                  {item.content}
                </div>
              </div>
              <div className="flex items-center" style={{ gap: 8 }}>
                {categorySelect}
                <span className="ml-auto flex items-center" style={{ gap: 4 }}>
                  <MoveButton
                    dir={-1}
                    disabled={idx === 0}
                    onClick={() => moveAgendaItem(employeeId, activeItems, item.id, -1).then(ok => { if (ok) onUpdate() })}
                  />
                  <MoveButton
                    dir={1}
                    disabled={idx === activeItems.length - 1}
                    onClick={() => moveAgendaItem(employeeId, activeItems, item.id, 1).then(ok => { if (ok) onUpdate() })}
                  />
                  {star}
                  {removeBtn}
                </span>
              </div>
            </div>
          )
        }

        return (
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
              padding: '11px 14px',
              borderRadius: 12,
              background: '#F8FBFF',
              border: overId === item.id && draggedId !== item.id ? '1px solid #0075FF' : '1px solid #F0F0F0',
              opacity: draggedId === item.id ? .45 : 1,
              cursor: 'grab',
              transitionDuration: '.2s',
            }}
          >
            <div className="flex items-center flex-none" style={{ gap: 10, paddingTop: 2 }}>
              <DragHandle />
              <SpecCheckbox checked={false} onChange={() => toggle(item)} />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 14, overflowWrap: 'break-word' }}>{item.content}</div>
              <div className="flex items-center" style={{ gap: 8, marginTop: 3 }}>
                {categorySelect}
                <span style={{ fontSize: 12, color: '#A5AEB8' }}>В повестку следующей встречи</span>
              </div>
            </div>
            <div className="flex items-center flex-none" style={{ gap: 8, paddingTop: 2 }}>
              {star}
              {removeBtn}
            </div>
          </div>
        )
      })}

      {discussedItems.length > 0 && (
        <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#828B95' }}>Обсуждено</div>
          {discussedItems.map(item => (
            <div
              key={item.id}
              className="flex items-start"
              style={{
                gap: 10,
                padding: '11px 14px',
                borderRadius: 12,
                background: '#F8FBFF',
                border: '1px solid #EAF3FF',
              }}
            >
              <div style={{ paddingTop: mobile ? 0 : 2 }}>
                <SpecCheckbox checked onChange={() => toggle(item)} color="#1BCE7B" />
              </div>
              <div className="flex-1 min-w-0" style={{ paddingTop: mobile ? 10 : 0 }}>
                <span
                  className="text-[14px] md:text-[14px] max-md:text-[15px]"
                  style={{ color: '#A5AEB8', textDecoration: 'line-through', overflowWrap: 'break-word' }}
                >
                  {item.content}
                </span>
              </div>
              <div className="flex items-center flex-none" style={{ gap: 8, paddingTop: mobile ? 4 : 2 }}>
                <Star active={item.isImportant} onClick={() => toggleImportant(item)} />
                <button
                  onClick={() => remove(item.id)}
                  aria-label="Удалить пункт"
                  className="tap-sm"
                  style={{ fontSize: 13, color: '#A5AEB8' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
