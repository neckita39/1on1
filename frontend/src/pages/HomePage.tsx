import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { employeesApi, authApi, Employee } from '../api/client'
import { useAuth } from '../App'
import { useI18n } from '../i18n'
import EmployeeCard from '../components/EmployeeCard'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function HomePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPosition, setNewPosition] = useState('')
  const [adding, setAdding] = useState(false)
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
  }, [])

  const handleLogout = async () => {
    await authApi.logout()
    await refresh()
    navigate('/login')
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    setAdding(true)
    try {
      await employeesApi.create({
        name: newName.trim(),
        position: newPosition.trim() || undefined,
      })
      setNewName('')
      setNewPosition('')
      setShowAddForm(false)
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

        {showAddForm && (
          <div className="bg-white shadow rounded-lg p-4 mb-6">
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
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
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
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {employees.map((employee) => (
              <EmployeeCard key={employee.id} employee={employee} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
