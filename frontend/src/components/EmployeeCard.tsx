import { Link } from 'react-router-dom'
import { Employee } from '../api/client'
import { useI18n } from '../i18n'

interface Props {
  employee: Employee
}

export default function EmployeeCard({ employee }: Props) {
  const { t, language } = useI18n()

  return (
    <Link
      to={`/employees/${employee.id}`}
      className="block bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          {employee.avatarUrl ? (
            <img
              src={employee.avatarUrl}
              alt={employee.name}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm flex-shrink-0">
              {employee.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{employee.name}</h3>
            {employee.position && (
              <p className="text-sm text-gray-500">{employee.position}</p>
            )}
          </div>
        </div>
        {employee.agendaCount > 0 && (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
            {employee.agendaCount} {t('topics')}
          </span>
        )}
      </div>
      <div className="mt-3 text-sm text-gray-500">
        {employee.lastMeetingDate ? (
          <span>{t('lastMeeting')}: {new Date(employee.lastMeetingDate).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')}</span>
        ) : (
          <span>{t('noMeetingsYet')}</span>
        )}
      </div>
    </Link>
  )
}
