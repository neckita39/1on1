import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { employeesApi, agendaApi, meetingsApi, Employee, AgendaItem, Meeting, BitrixUserPreview } from '../api/client'
import { useI18n } from '../i18n'
import ClockWidget from '../components/ClockWidget'
import AgendaList from '../components/AgendaList'
import MeetingForm from '../components/MeetingForm'
import MeetingHistory from '../components/MeetingHistory'

export default function EmployeePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [agenda, setAgenda] = useState<AgendaItem[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPosition, setEditPosition] = useState('')
  const [editBio, setEditBio] = useState('')
  const [showMeetingForm, setShowMeetingForm] = useState(false)
  const [bitrixConfigured, setBitrixConfigured] = useState(false)
  const [showBitrixLink, setShowBitrixLink] = useState(false)
  const [bitrixLinkId, setBitrixLinkId] = useState('')
  const [bitrixLinkPreview, setBitrixLinkPreview] = useState<BitrixUserPreview | null>(null)
  const [bitrixLinkLooking, setBitrixLinkLooking] = useState(false)
  const [bitrixLinkError, setBitrixLinkError] = useState('')
  const [bitrixLinking, setBitrixLinking] = useState(false)
  const { t } = useI18n()

  const employeeId = parseInt(id || '0')

  const loadData = async () => {
    try {
      const [empRes, agendaRes, meetingsRes] = await Promise.all([
        employeesApi.get(employeeId),
        agendaApi.list(employeeId),
        meetingsApi.list(employeeId),
      ])
      setEmployee(empRes.data)
      setAgenda(agendaRes.data)
      setMeetings(meetingsRes.data)
      setEditName(empRes.data.name)
      setEditPosition(empRes.data.position || '')
      setEditBio(empRes.data.bio || '')
    } catch (error) {
      console.error('Failed to load data', error)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    employeesApi.bitrixStatus().then(res => setBitrixConfigured(res.data.configured)).catch(() => {})
  }, [employeeId])

  const handleBitrixLinkLookup = async () => {
    const numId = parseInt(bitrixLinkId)
    if (!numId) return
    setBitrixLinkLooking(true)
    setBitrixLinkError('')
    setBitrixLinkPreview(null)
    try {
      const res = await employeesApi.bitrixPreview(numId)
      setBitrixLinkPreview(res.data)
    } catch (error: any) {
      if (error.response?.status === 409) {
        setBitrixLinkError(t('bitrixAlreadyLinked'))
      } else {
        setBitrixLinkError(t('bitrixLookupFailed'))
      }
    } finally {
      setBitrixLinkLooking(false)
    }
  }

  const handleBitrixLink = async () => {
    const numId = parseInt(bitrixLinkId)
    if (!numId || !bitrixLinkPreview) return
    setBitrixLinking(true)
    try {
      await employeesApi.update(employeeId, {
        bitrixId: numId,
        avatarUrl: bitrixLinkPreview.avatarUrl,
      })
      setShowBitrixLink(false)
      setBitrixLinkId('')
      setBitrixLinkPreview(null)
      setBitrixLinkError('')
      loadData()
    } catch (error) {
      console.error('Failed to link Bitrix24', error)
    } finally {
      setBitrixLinking(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editName.trim()) return
    try {
      await employeesApi.update(employeeId, {
        name: editName.trim(),
        position: editPosition.trim() || undefined,
        bio: editBio.trim() || undefined,
      })
      setEditing(false)
      loadData()
    } catch (error) {
      console.error('Failed to update employee', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('deleteEmployeeConfirm'))) {
      return
    }
    try {
      await employeesApi.delete(employeeId)
      navigate('/')
    } catch (error) {
      console.error('Failed to delete employee', error)
    }
  }

  const handleMeetingComplete = () => {
    setShowMeetingForm(false)
    loadData()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!employee) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            {!editing && employee.avatarUrl ? (
              <img src={employee.avatarUrl} alt={employee.name} className="w-8 h-8 rounded-full object-cover" />
            ) : !editing ? (
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">
                {employee.name.charAt(0).toUpperCase()}
              </div>
            ) : null}
            <h1 className="text-xl font-bold text-gray-900">
              {editing ? t('editEmployee') : employee.name}
            </h1>
          </div>
          <ClockWidget />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Employee Info */}
        <section className="bg-white shadow rounded-lg p-4">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('position')}</label>
                <input
                  type="text"
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('bio')}</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={4}
                  placeholder={t('bioPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
                >
                  {t('save')}
                </button>
                <button
                  onClick={() => {
                    setEditing(false)
                    setEditName(employee.name)
                    setEditPosition(employee.position || '')
                    setEditBio(employee.bio || '')
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  {employee.avatarUrl ? (
                    <img src={employee.avatarUrl} alt={employee.name} className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl flex-shrink-0">
                      {employee.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="font-semibold text-lg">{employee.name}</h2>
                    {employee.position && (
                      <p className="text-gray-500">{employee.position}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(true)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {t('edit')}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
              {employee.bio && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{employee.bio}</p>
                </div>
              )}
              {bitrixConfigured && !employee.bitrixId && !showBitrixLink && (
                <div className="pt-3 border-t border-gray-200">
                  <button
                    onClick={() => setShowBitrixLink(true)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {t('linkToBitrix')}
                  </button>
                </div>
              )}
              {showBitrixLink && (
                <div className="pt-3 border-t border-gray-200 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('bitrixId')}</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={bitrixLinkId}
                        onChange={(e) => { setBitrixLinkId(e.target.value); setBitrixLinkPreview(null); setBitrixLinkError('') }}
                        placeholder={t('bitrixIdPlaceholder')}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleBitrixLinkLookup}
                        disabled={!bitrixLinkId || bitrixLinkLooking}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {bitrixLinkLooking ? '...' : t('lookup')}
                      </button>
                    </div>
                    {bitrixLinkError && <p className="mt-1 text-sm text-red-600">{bitrixLinkError}</p>}
                  </div>
                  {bitrixLinkPreview && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                      {bitrixLinkPreview.avatarUrl ? (
                        <img src={bitrixLinkPreview.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">
                          {bitrixLinkPreview.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{bitrixLinkPreview.name}</p>
                        {bitrixLinkPreview.position && <p className="text-sm text-gray-500">{bitrixLinkPreview.position}</p>}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {bitrixLinkPreview && (
                      <button
                        onClick={handleBitrixLink}
                        disabled={bitrixLinking}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {bitrixLinking ? t('linking') : t('link')}
                      </button>
                    )}
                    <button
                      onClick={() => { setShowBitrixLink(false); setBitrixLinkId(''); setBitrixLinkPreview(null); setBitrixLinkError('') }}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Conduct 1-1 Button */}
        {!showMeetingForm && (
          <button
            onClick={() => setShowMeetingForm(true)}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            {t('conductMeeting')}
          </button>
        )}

        {/* Meeting Form */}
        {showMeetingForm && (
          <MeetingForm
            employeeId={employeeId}
            agenda={agenda}
            onComplete={handleMeetingComplete}
            onCancel={() => setShowMeetingForm(false)}
          />
        )}

        {/* Agenda */}
        <section className="bg-white shadow rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4">{t('agendaTopics')}</h3>
          <AgendaList
            employeeId={employeeId}
            items={agenda}
            onUpdate={loadData}
          />
        </section>

        {/* Meeting History */}
        <section className="bg-white shadow rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4">{t('meetingHistory')}</h3>
          <MeetingHistory meetings={meetings} />
        </section>
      </main>
    </div>
  )
}
