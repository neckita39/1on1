import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { scrumApi, ScrumNote } from '../api/client'
import { useI18n } from '../i18n'

export default function ScrumPage() {
  const [notes, setNotes] = useState<ScrumNote[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editDate, setEditDate] = useState('')
  const navigate = useNavigate()
  const { t, language } = useI18n()

  const loadNotes = async () => {
    try {
      const res = await scrumApi.list()
      setNotes(res.data)
    } catch (error) {
      console.error('Failed to load scrum notes', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotes()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContent.trim()) return

    setSaving(true)
    try {
      await scrumApi.create({ content: newContent.trim(), date: newDate })
      setNewContent('')
      setNewDate(new Date().toISOString().split('T')[0])
      setShowForm(false)
      loadNotes()
    } catch (error) {
      console.error('Failed to create scrum note', error)
    } finally {
      setSaving(false)
    }
  }

  const handleStartEdit = (note: ScrumNote) => {
    setEditingId(note.id)
    setEditContent(note.content)
    setEditDate(note.date)
  }

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editingId === null) return

    setSaving(true)
    try {
      await scrumApi.update(editingId, { content: editContent.trim(), date: editDate })
      setEditingId(null)
      setEditContent('')
      setEditDate('')
      loadNotes()
    } catch (error) {
      console.error('Failed to update scrum note', error)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">{t('scrumTitle')}</h1>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            {t('scrumBack')}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
          >
            {t('scrumNew')}
          </button>
        )}

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white shadow rounded-lg p-4 mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('scrumDate')}</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('scrumContent')}</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={8}
                placeholder={t('scrumContentPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !newContent.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? t('saving') : t('scrumSave')}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setNewContent(''); setNewDate(new Date().toISOString().split('T')[0]) }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">{t('scrumNoEntries')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="bg-white shadow rounded-lg p-4">
                {editingId === note.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('scrumDate')}</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={saving || !editContent.trim()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? t('saving') : t('scrumSave')}
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditContent(''); setEditDate('') }}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-gray-900">{formatDate(note.date)}</h3>
                      <button
                        onClick={() => handleStartEdit(note)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {t('scrumEdit')}
                      </button>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
