import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ordersApi } from '../api'
import { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatDate, formatPrice, initials } from '../utils/format'

export default function Profile() {
  const { user, updateProfile, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState({ full_name: user.full_name, phone: user.phone || '' })
  const [busy, setBusy] = useState(false)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    ordersApi.my().then((orders) => setStats({
      count: orders.length,
      active: orders.filter((o) => ['new', 'accepted', 'ready'].includes(o.status)).length,
      spent: orders.filter((o) => o.status === 'completed').reduce((s, o) => s + o.total_price, 0),
    })).catch(() => {})
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await updateProfile({ full_name: form.full_name.trim(), phone: form.phone.trim() })
      toast.show('Профиль сохранён')
    } catch (err) {
      toast.show(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container page profile">
      <div className="profile__card">
        <span className="avatar avatar--lg">{initials(user.full_name)}</span>
        <div>
          <h1>{user.full_name}</h1>
          <p className="muted">{user.email} · с нами с {formatDate(user.created_at)}</p>
        </div>
        <button className="btn btn--line profile__logout" onClick={() => { logout(); navigate('/') }}>Выйти</button>
      </div>

      {stats && (
        <div className="stat-row">
          <Link to="/orders" className="stat"><b>{stats.count}</b><span>всего заказов</span></Link>
          <Link to="/orders" className="stat"><b>{stats.active}</b><span>в работе</span></Link>
          <div className="stat"><b>{formatPrice(stats.spent)}</b><span>потрачено</span></div>
        </div>
      )}

      <form className="panel" onSubmit={submit}>
        <h2>Личные данные</h2>
        <label className="field"><span>ФИО</span>
          <input required minLength={2} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </label>
        <label className="field"><span>Телефон</span>
          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+992 90 000-00-00" />
        </label>
        <label className="field"><span>Email</span>
          <input value={user.email} disabled />
          <small className="muted">Email нельзя изменить — он используется для входа.</small>
        </label>
        <button className="btn btn--primary" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить изменения'}</button>
      </form>
    </div>
  )
}
