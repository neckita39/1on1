import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { agendaApi, ImportantItem, AgendaCategory } from '../api/client'
import { useI18n } from '../i18n'

const categoryColors: Record<AgendaCategory, string> = {
  note: 'bg-gray-50 border-l-4 border-gray-300',
  positive: 'bg-green-50 border-l-4 border-green-500',
  warning: 'bg-yellow-50 border-l-4 border-yellow-500',
  problem: 'bg-red-50 border-l-4 border-red-500',
}

export default function ImportantPage() {
  const [items, setItems] = useState<ImportantItem[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { t, language } = useI18n()

  const loadItems = async () => {
    try {
      const res = await agendaApi.important()
      setItems(res.data)
    } catch (error) {
      console.error('Failed to load important items', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  const handleUnmark = async (id: number) => {
    try {
      await agendaApi.update(id, { isImportant: false })
      setItems(prev => prev.filter(item => item.id !== id))
    } catch (error) {
      console.error('Failed to unmark important', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">{t('importantTitle')}</h1>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            {t('importantBack')}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">{t('noImportantItems')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-md ${categoryColors[item.category]}`}
              >
                <button
                  onClick={() => handleUnmark(item.id)}
                  className="flex-shrink-0 pt-0.5"
                  title={t('important')}
                >
                  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
                <div className="flex-1 min-w-0">
                  <span className={`break-words ${item.isDiscussed ? 'line-through opacity-60' : ''}`}>
                    {item.content}
                  </span>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <Link
                      to={`/employees/${item.employeeId}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {item.employeeName}
                    </Link>
                    <span>&middot;</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
