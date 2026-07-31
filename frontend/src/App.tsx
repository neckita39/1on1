import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { authApi, AuthStatus } from './api/client'
import { I18nProvider } from './i18n'
import { ToastProvider } from './ui/toast'
import AppShell from './layout/AppShell'
import Splash from './components/Splash'
import LoginPage from './pages/LoginPage'
import SetupPage from './pages/SetupPage'
import HomePage from './pages/HomePage'
import EmployeePage from './pages/EmployeePage'
import MeetingPage from './pages/MeetingPage'
import HistoryPage from './pages/HistoryPage'
import DailyPage from './pages/DailyPage'
import ImportantPage from './pages/ImportantPage'
import ScrumPage from './pages/ScrumPage'

interface AuthContextType {
  status: AuthStatus | null
  loading: boolean
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  status: null,
  loading: true,
  refresh: async () => {},
})

export const useAuth = () => useContext(AuthContext)

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const response = await authApi.check()
      setStatus(response.data)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <AuthContext.Provider value={{ status, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

function ProtectedLayout() {
  const { status, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen bg-page" />
  }

  if (status?.needsSetup) {
    return <Navigate to="/setup" replace />
  }

  if (!status?.isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <ToastProvider>
            <Splash />
            <Routes>
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/employees/:id" element={<EmployeePage />} />
                <Route path="/meeting/:id" element={<MeetingPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/daily" element={<DailyPage />} />
                <Route path="/important" element={<ImportantPage />} />
                <Route path="/scrum" element={<ScrumPage />} />
              </Route>
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  )
}

export default App
