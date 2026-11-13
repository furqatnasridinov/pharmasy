import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { LogoMark } from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Register() {
  const { user, register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) { setError('Пароль должен быть не короче 6 символов'); return }
    setBusy(true)
    try {
      await register({ ...form, email: form.email.trim(), phone: form.phone.trim() || null })
      toast.show('Аккаунт создан')
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="auth-page__logo" aria-label="На главную"><LogoMark size={36} /><span>Darmon</span></Link>
      <form className="auth-card" onSubmit={submit}>
        <h1>Регистрация</h1>
        <p className="muted">Аккаунт нужен для заказов, избранного и отзывов.</p>
        <label className="field"><span>ФИО</span>
          <input required minLength={2} autoComplete="name" value={form.full_name} onChange={set('full_name')} placeholder="Мадина Рахимова" />
        </label>
        <label className="field"><span>Телефон</span>
          <input type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="+992 90 000-00-00" />
        </label>
        <label className="field"><span>Email</span>
          <input type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
        </label>
        <label className="field"><span>Пароль</span>
          <input type="password" required minLength={6} autoComplete="new-password" value={form.password} onChange={set('password')} />
          <small className="muted">Не короче 6 символов</small>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn--primary btn--block btn--lg" disabled={busy}>{busy ? 'Создаём…' : 'Создать аккаунт'}</button>
        <p className="auth-card__alt">Уже есть аккаунт? <Link to="/login" state={location.state}>Войти</Link></p>
      </form>
      <Link to="/" className="auth-page__back">← Вернуться в аптеку</Link>
    </div>
  )
}
