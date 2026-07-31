import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { authApi } from '../api/client'
import { useAuth } from '../App'
import AuthLayout from '../components/AuthLayout'
import { Button } from '../ui'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const { status, refresh } = useAuth()

  if (status?.needsSetup) return <Navigate to="/setup" replace />
  if (status?.isAuthenticated) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setSubmitting(true)
    setError('')
    try {
      await authApi.login(password)
      await refresh()
      navigate('/')
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('Слишком много попыток. Попробуйте позже.')
      } else {
        setError('Неверный пароль')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col" style={{ gap: 8, animation: 'fadeUp .6s cubic-bezier(.22,1,.36,1) .2s both' }}>
        <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-.6px' }}>Вход для тимлида</div>
        <div style={{ fontSize: 14, color: '#828B95' }}>Введите пароль, чтобы продолжить</div>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 20 }}>
        <label className="flex flex-col" style={{ gap: 8, animation: 'fadeUp .6s cubic-bezier(.22,1,.36,1) .3s both' }}>
          <span style={{ fontSize: 13, color: '#525C69' }}>Пароль</span>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            className="input-spec"
            autoFocus
          />
        </label>
        {error && (
          <div className="anim-fade-up" style={{ fontSize: 13, color: '#FF5752', animationDuration: '.3s' }}>{error}</div>
        )}
        <div style={{ animation: 'fadeUp .6s cubic-bezier(.22,1,.36,1) .46s both' }}>
          <Button type="submit" size="lg" sheen disabled={submitting || !password} className="w-full">
            {submitting ? 'Входим…' : 'Войти'}
          </Button>
        </div>
      </form>
    </AuthLayout>
  )
}
