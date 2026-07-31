import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { agendaApi, ImportantItem } from '../api/client'
import { Card, formatDateRuFull } from '../ui'
import { CATEGORY_META } from '../components/AgendaList'

export default function ImportantPage() {
  const [items, setItems] = useState<ImportantItem[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = async () => {
    try {
      const res = await agendaApi.important()
      setItems(res.data)
    } catch (error) {
      console.error('Failed to load important items', error)
    } finally {
      setLoaded(true)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const unmark = async (id: number) => {
    try {
      await agendaApi.update(id, { isImportant: false })
      setItems(prev => prev.filter(item => item.id !== id))
    } catch (error) {
      console.error('Failed to unmark important', error)
    }
  }

  return (
    <div className="flex flex-col" style={{ gap: 20, maxWidth: 720 }}>
      <div className="flex flex-col anim-fade-up" style={{ gap: 6 }}>
        <div className="eyebrow">На контроле</div>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-.8px' }}>Важное</div>
      </div>

      {loaded && items.length === 0 ? (
        <Card style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#828B95' }}>
            Отметьте пункт повестки звёздочкой — он появится здесь
          </div>
        </Card>
      ) : (
        <div className="flex flex-col" style={{ gap: 10 }}>
          {items.map((item, i) => {
            const meta = CATEGORY_META[item.category]
            return (
              <Card
                key={item.id}
                className="flex items-start anim-fade-up"
                style={{ padding: '14px 16px', gap: 12, animationDuration: '.45s', animationDelay: `${i * 0.05}s` }}
              >
                <button
                  onClick={() => unmark(item.id)}
                  className="flex-none transition-opacity hover:opacity-60"
                  style={{ paddingTop: 2 }}
                  title="Снять отметку"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#FAA72C">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
                <div className="flex-1 min-w-0">
                  <div
                    style={{
                      fontSize: 14,
                      lineHeight: 1.55,
                      overflowWrap: 'break-word',
                      color: item.isDiscussed ? '#A5AEB8' : '#333',
                      textDecoration: item.isDiscussed ? 'line-through' : 'none',
                    }}
                  >
                    {item.content}
                  </div>
                  <div className="flex items-center flex-wrap" style={{ gap: 8, marginTop: 6 }}>
                    <span className="rounded-full inline-block" style={{ width: 6, height: 6, background: meta.color }} />
                    <span style={{ fontSize: 12, color: meta.color }}>{meta.label}</span>
                    <Link
                      to={`/employees/${item.employeeId}`}
                      className="transition-opacity hover:opacity-65"
                      style={{ fontSize: 12, fontWeight: 500, color: '#0154C8' }}
                    >
                      {item.employeeName}
                    </Link>
                    <span style={{ fontSize: 12, color: '#A5AEB8' }}>· {formatDateRuFull(item.createdAt)}</span>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
