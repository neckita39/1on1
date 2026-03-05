import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { employeesApi, authApi, Employee, BitrixUserPreview } from '../api/client'
import { useAuth } from '../App'
import { useI18n } from '../i18n'
import EmployeeCard from '../components/EmployeeCard'
import LanguageSwitcher from '../components/LanguageSwitcher'
import ClockWidget from '../components/ClockWidget'

export default function HomePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPosition, setNewPosition] = useState('')
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [bitrixConfigured, setBitrixConfigured] = useState(false)
  const [addMode, setAddMode] = useState<'manual' | 'bitrix'>('manual')
  const [bitrixId, setBitrixId] = useState('')
  const [bitrixPreview, setBitrixPreview] = useState<BitrixUserPreview | null>(null)
  const [bitrixLooking, setBitrixLooking] = useState(false)
  const [bitrixError, setBitrixError] = useState('')
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const { t } = useI18n()

  const loadEmployees = async () => {
    try {
      const response = await employeesApi.list()
      setEmployees(response.data)
    } catch (error) {
      console.error('Failed to load employees', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmployees()
    employeesApi.bitrixStatus().then(res => setBitrixConfigured(res.data.configured)).catch(() => {})
  }, [])

  const handleLogout = async () => {
    await authApi.logout()
    await refresh()
    navigate('/login')
  }

  const handleBitrixLookup = async () => {
    const id = parseInt(bitrixId)
    if (!id) return

    setBitrixLooking(true)
    setBitrixError('')
    setBitrixPreview(null)
    try {
      const res = await employeesApi.bitrixPreview(id)
      setBitrixPreview(res.data)
      setNewName(res.data.name)
      setNewPosition(res.data.position || '')
    } catch (error: any) {
      if (error.response?.status === 409) {
        setBitrixError(t('bitrixAlreadyLinked'))
      } else {
        setBitrixError(t('bitrixLookupFailed'))
      }
    } finally {
      setBitrixLooking(false)
    }
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    setAdding(true)
    try {
      await employeesApi.create({
        name: newName.trim(),
        position: newPosition.trim() || undefined,
        ...(addMode === 'bitrix' && bitrixPreview ? {
          bitrixId: parseInt(bitrixId),
          avatarUrl: bitrixPreview.avatarUrl || undefined,
        } : {}),
      })
      setNewName('')
      setNewPosition('')
      setBitrixId('')
      setBitrixPreview(null)
      setBitrixError('')
      setShowAddForm(false)
      setAddMode('manual')
      loadEmployees()
    } catch (error) {
      console.error('Failed to add employee', error)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">{t('appName')}</h1>
          <div className="flex items-center gap-4">
            <ClockWidget />
            <LanguageSwitcher />
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800">{t('employees')}</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
          >
            {t('addEmployee')}
          </button>
        </div>

        {employees.length > 0 && (
          <div className="mb-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchEmployees')}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>
        )}

        {showAddForm && (
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            {bitrixConfigured && (
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  type="button"
                  onClick={() => { setAddMode('manual'); setBitrixPreview(null); setBitrixError(''); setBitrixId(''); setNewName(''); setNewPosition('') }}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${addMode === 'manual' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {t('manual')}
                </button>
                <button
                  type="button"
                  onClick={() => { setAddMode('bitrix'); setBitrixPreview(null); setBitrixError(''); setNewName(''); setNewPosition('') }}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${addMode === 'bitrix' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {t('fromBitrix')}
                </button>
              </div>
            )}

            {addMode === 'bitrix' && bitrixConfigured ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('bitrixId')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={bitrixId}
                      onChange={(e) => { setBitrixId(e.target.value); setBitrixPreview(null); setBitrixError('') }}
                      placeholder={t('bitrixIdPlaceholder')}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleBitrixLookup}
                      disabled={!bitrixId || bitrixLooking}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {bitrixLooking ? '...' : t('lookup')}
                    </button>
                  </div>
                  {bitrixError && (
                    <p className="mt-1 text-sm text-red-600">{bitrixError}</p>
                  )}
                </div>

                {bitrixPreview && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                    {bitrixPreview.avatarUrl ? (
                      <img src={bitrixPreview.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">
                        {bitrixPreview.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{bitrixPreview.name}</p>
                      {bitrixPreview.position && <p className="text-sm text-gray-500">{bitrixPreview.position}</p>}
                    </div>
                  </div>
                )}

                {bitrixPreview && (
                  <form onSubmit={handleAddEmployee} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('positionOptional')}</label>
                      <input
                        type="text"
                        value={newPosition}
                        onChange={(e) => setNewPosition(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={adding} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
                        {adding ? t('adding') : t('add')}
                      </button>
                      <button type="button" onClick={() => { setShowAddForm(false); setNewName(''); setNewPosition(''); setBitrixId(''); setBitrixPreview(null); setBitrixError(''); setAddMode('manual') }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300">
                        {t('cancel')}
                      </button>
                    </div>
                  </form>
                )}

                {!bitrixPreview && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setShowAddForm(false); setBitrixId(''); setBitrixError(''); setAddMode('manual') }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300">
                      {t('cancel')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('name')}
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('positionOptional')}
                  </label>
                  <input
                    type="text"
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={adding}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {adding ? t('adding') : t('add')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setNewName('')
                      setNewPosition('')
                      setAddMode('manual')
                    }}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">{t('noEmployees')}</p>
          </div>
        ) : (() => {
          const query = search.toLowerCase().trim()
          const filtered = query
            ? employees.filter(e =>
                e.name.toLowerCase().includes(query) ||
                (e.position && e.position.toLowerCase().includes(query))
              )
            : employees
          return filtered.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">{t('noSearchResults')}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((employee) => (
                <EmployeeCard key={employee.id} employee={employee} />
              ))}
            </div>
          )
        })()}
      </main>
    </div>
  )
}
