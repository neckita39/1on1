import { Meeting } from '../api/client'
import { useI18n } from '../i18n'

interface Props {
  meetings: Meeting[]
}

export default function MeetingHistory({ meetings }: Props) {
  const { t, language } = useI18n()

  if (meetings.length === 0) {
    return (
      <p className="text-gray-500 text-sm">{t('noMeetingsHistory')}</p>
    )
  }

  const dateLocale = language === 'ru' ? 'ru-RU' : 'en-US'

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => (
        <div
          key={meeting.id}
          className="border-l-4 border-blue-500 pl-4 py-2"
        >
          <div className="text-sm font-medium text-gray-800">
            {new Date(meeting.date).toLocaleDateString(dateLocale, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          {meeting.discussedTopics && meeting.discussedTopics.length > 0 && (
            <div className="mt-2">
              <span className="text-xs font-medium text-gray-500 uppercase">{t('discussedLabel')}</span>
              <ul className="mt-1 space-y-1">
                {meeting.discussedTopics.map((topic, idx) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {meeting.notes ? (
            <p className="text-gray-600 mt-2 whitespace-pre-wrap">{meeting.notes}</p>
          ) : (
            <p className="text-gray-400 mt-2 italic">{t('noNotes')}</p>
          )}
        </div>
      ))}
    </div>
  )
}
