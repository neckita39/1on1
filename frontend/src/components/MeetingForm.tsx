import { useState } from 'react'
import { meetingsApi, agendaApi, AgendaItem, AgendaCategory } from '../api/client'
import { useI18n } from '../i18n'

interface Props {
  employeeId: number
  agenda: AgendaItem[]
  onComplete: () => void
  onCancel: () => void
}

const categoryColors: Record<AgendaCategory, string> = {
  note: 'bg-gray-50 border-l-4 border-gray-300',
  positive: 'bg-green-50 border-l-4 border-green-500',
  warning: 'bg-yellow-50 border-l-4 border-yellow-500',
  problem: 'bg-red-50 border-l-4 border-red-500',
}

export default function MeetingForm({ employeeId, agenda, onComplete, onCancel }: Props) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Set<number>>(
    new Set(agenda.filter((item) => item.isDiscussed).map((item) => item.id))
  )
  const { t } = useI18n()

  const activeItems = agenda.filter((item) => !item.isDiscussed)

  const handleToggle = (id: number) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(id)) {
      newChecked.delete(id)
    } else {
      newChecked.add(id)
    }
    setCheckedItems(newChecked)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Get discussed topics content
      const toMark = activeItems.filter((item) => checkedItems.has(item.id))
      const discussedTopics = toMark.map((item) => item.content)

      // Create meeting with discussed topics
      await meetingsApi.create(employeeId, { notes, discussedTopics })

      // Mark items as discussed in agenda
      await Promise.all(
        toMark.map((item) => agendaApi.update(item.id, { isDiscussed: true }))
      )

      onComplete()
    } catch (error) {
      console.error('Failed to save meeting', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-4 border-2 border-green-500">
      <h3 className="font-semibold text-lg text-gray-800 mb-4">{t('conductMeeting')}</h3>

      {activeItems.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">{t('topicsToDiscuss')}</h4>
          <ul className="space-y-2">
            {activeItems.map((item) => (
              <li
                key={item.id}
                className={`flex items-center gap-3 p-2 rounded-md ${categoryColors[item.category]}`}
              >
                <input
                  type="checkbox"
                  checked={checkedItems.has(item.id)}
                  onChange={() => handleToggle(item.id)}
                  className="w-4 h-4 text-green-600"
                />
                <span className={checkedItems.has(item.id) ? 'line-through text-gray-400' : ''}>
                  {item.content}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('meetingNotes')}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('meetingNotesPlaceholder')}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? t('saving') : t('completeMeeting')}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="bg-gray-200 text-gray-700 py-2 px-4 rounded-md font-medium hover:bg-gray-300"
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}
