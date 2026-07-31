import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { authApi } from '../api/client'
import { useAuth } from '../App'
import AuthLayout from '../components/AuthLayout'
import { Button } from '../ui'

export default function SetupPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const { status, refresh } = useAuth()

  if (status && !status.needsSetup) return <Navigate to="/login" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 12) {
      setError('Пароль должен быть не короче 12 символов')
      return
    }
    if (password !== confirm) {
      setError('Пароли не совпадают')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await authApi.setup(password)
      await refresh()
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Не удалось сохранить пароль')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col" style={{ gap: 8, animation: 'fadeUp .6s cubic-bezier(.22,1,.36,1) .2s both' }}>
        <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-.6px' }}>Первый запуск</div>
        <div style={{ fontSize: 14, color: '#828B95' }}>Задайте пароль — минимум 12 символов</div>
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
        <label className="flex flex-col" style={{ gap: 8, animation: 'fadeUp .6s cubic-bezier(.22,1,.36,1) .38s both' }}>
          <span style={{ fontSize: 13, color: '#525C69' }}>Ещё раз</span>
          <input
            type="password"
            value={confirm}
            onChange={e => { setConfirm(e.target.value); setError('') }}
            className="input-spec"
          />
        </label>
        {error && (
          <div className="anim-fade-up" style={{ fontSize: 13, color: '#FF5752', animationDuration: '.3s' }}>{error}</div>
        )}
        <div style={{ animation: 'fadeUp .6s cubic-bezier(.22,1,.36,1) .46s both' }}>
          <Button type="submit" size="lg" sheen disabled={submitting || !password || !confirm} className="w-full">
            {submitting ? 'Сохраняем…' : 'Начать работу'}
          </Button>
        </div>
      </form>
    </AuthLayout>
  )
}
