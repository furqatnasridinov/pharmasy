import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Login() {
  const { user, login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={from} replace />

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const u = await login(form.email.trim(), form.password)
      toast.show(`Здравствуйте, ${u.full_name.split(' ')[0]}!`)
      navigate(u.role === 'admin' && from === '/' ? '/admin' : from, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const fill = (email, password) => setForm({ email, password })

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Вход</h1>
        <p className="muted">Войдите, чтобы оформить заказ и следить за его статусом.</p>
        <label className="field"><span>Email</span>
          <input type="email" autoComplete="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="field"><span>Пароль</span>
          <input type="password" autoComplete="current-password" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn--primary btn--block btn--lg" disabled={busy}>{busy ? 'Входим…' : 'Войти'}</button>
        <p className="auth-card__alt">Нет аккаунта? <Link to="/register" state={location.state}>Зарегистрируйтесь</Link></p>
        <div className="demo-accounts">
          <span>Тестовые аккаунты:</span>
          <button type="button" className="link" onClick={() => fill('user@pharmacy.local', 'user123')}>Покупатель</button>
          <button type="button" className="link" onClick={() => fill('admin@pharmacy.local', 'admin123')}>Администратор</button>
        </div>
      </form>
    </div>
  )
}
