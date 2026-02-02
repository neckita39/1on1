import { useState } from 'react'
import { agendaApi, AgendaItem, AgendaCategory } from '../api/client'
import { useI18n } from '../i18n'

interface Props {
  employeeId: number
  items: AgendaItem[]
  onUpdate: () => void
}

const categoryColors: Record<AgendaCategory, string> = {
  note: 'bg-gray-50 border-l-4 border-gray-300',
  positive: 'bg-green-50 border-l-4 border-green-500',
  warning: 'bg-yellow-50 border-l-4 border-yellow-500',
  problem: 'bg-red-50 border-l-4 border-red-500',
}

const categoryLabels: Record<AgendaCategory, string> = {
  note: 'categoryNote',
  positive: 'categoryPositive',
  warning: 'categoryWarning',
  problem: 'categoryProblem',
}

export default function AgendaList({ employeeId, items, onUpdate }: Props) {
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState<AgendaCategory>('note')
  const [adding, setAdding] = useState(false)
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const { t, language } = useI18n()

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
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

  const handleToggle = async (item: AgendaItem) => {
    try {
      await agendaApi.update(item.id, { isDiscussed: !item.isDiscussed })
      onUpdate()
    } catch (error) {
      console.error('Failed to toggle agenda item', error)
    }
  }

  const handleCategoryChange = async (item: AgendaItem, category: AgendaCategory) => {
    try {
      await agendaApi.update(item.id, { category })
      onUpdate()
    } catch (error) {
      console.error('Failed to update category', error)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await agendaApi.delete(id)
      onUpdate()
    } catch (error) {
      console.error('Failed to delete agenda item', error)
    }
  }

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault()
    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null)
      return
    }

    const activeItems = items.filter((item) => !item.isDiscussed)
    const draggedIndex = activeItems.findIndex((item) => item.id === draggedId)
    const targetIndex = activeItems.findIndex((item) => item.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null)
      return
    }

    // Reorder items
    const reordered = [...activeItems]
    const [removed] = reordered.splice(draggedIndex, 1)
    reordered.splice(targetIndex, 0, removed)

    const newOrder = reordered.map((item) => item.id)

    try {
      await agendaApi.reorder(employeeId, newOrder)
      onUpdate()
    } catch (error) {
      console.error('Failed to reorder items', error)
    } finally {
      setDraggedId(null)
    }
  }

  const handleDragEnd = () => {
    setDraggedId(null)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const activeItems = items.filter((item) => !item.isDiscussed)
  const discussedItems = items.filter((item) => item.isDiscussed)

  const categories: AgendaCategory[] = ['note', 'positive', 'warning', 'problem']

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder={t('addTopicPlaceholder')}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={adding || !newContent.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {t('add')}
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setNewCategory(cat)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                newCategory === cat
                  ? cat === 'note'
                    ? 'bg-gray-200 border-gray-400'
                    : cat === 'positive'
                    ? 'bg-green-200 border-green-500'
                    : cat === 'warning'
                    ? 'bg-yellow-200 border-yellow-500'
                    : 'bg-red-200 border-red-500'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t(categoryLabels[cat] as any)}
            </button>
          ))}
        </div>
      </form>

      {activeItems.length === 0 && discussedItems.length === 0 ? (
        <p className="text-gray-500 text-sm py-2">{t('noTopics')}</p>
      ) : (
        <>
          {activeItems.length > 0 && (
            <ul className="space-y-2">
              {activeItems.map((item) => (
                <li
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, item.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-start gap-3 p-3 rounded-md cursor-move transition-opacity ${
                    categoryColors[item.category]
                  } ${draggedId === item.id ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-2 pt-0.5">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 8h16M4 16h16"
                      />
                    </svg>
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => handleToggle(item)}
                      className="w-4 h-4 text-blue-600"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="break-words">{item.content}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{t('createdAt')}: {formatDate(item.createdAt)}</span>
                      <select
                        value={item.category}
                        onChange={(e) => handleCategoryChange(item, e.target.value as AgendaCategory)}
                        className="text-xs bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {t(categoryLabels[cat] as any)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-gray-400 hover:text-red-600 flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {discussedItems.length > 0 && (
            <div className="pt-2 border-t">
              <h4 className="text-sm font-medium text-gray-500 mb-2">{t('discussed')}</h4>
              <ul className="space-y-2">
                {discussedItems.map((item) => (
                  <li
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-md opacity-60 ${categoryColors[item.category]}`}
                  >
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => handleToggle(item)}
                      className="w-4 h-4 text-blue-600 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="line-through break-words">{item.content}</span>
                      <div className="text-xs text-gray-500 mt-1">
                        {t('createdAt')}: {formatDate(item.createdAt)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-gray-400 hover:text-red-600 flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
