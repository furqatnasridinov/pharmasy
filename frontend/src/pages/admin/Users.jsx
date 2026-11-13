import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../api'
import { errorMessage } from '../../api/client'
import { Badge } from '../../components/Badges'
import { Loader } from '../../components/States'
import { useAuth } from '../../context/AuthContext'
import { useConfirm } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
import { formatDate, initials } from '../../utils/format'

const EMPTY = { id: null, email: '', full_name: '', phone: '', role: 'user', password: '' }

export default function Users() {
  const toast = useToast()
  const confirm = useConfirm()
  const { user: me } = useAuth()
  const [items, setItems] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [search, setSearch] = useState('')

  const load = () => adminApi.users().then(setItems).catch((e) => toast.show(errorMessage(e), 'error'))
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (items || []).filter((u) => !q || `${u.full_name} ${u.email} ${u.phone || ''}`.toLowerCase().includes(q))
  }, [items, search])

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const save = async (e) => {
    e.preventDefault()
    const base = { email: form.email.trim(), full_name: form.full_name.trim(), phone: form.phone.trim() || null, role: form.role }
    try {
      if (form.id) await adminApi.updateUser(form.id, { ...base, new_password: form.password || null })
      else await adminApi.createUser({ ...base, password: form.password })
      toast.show(form.id ? 'Данные пользователя сохранены' : 'Пользователь создан')
      setForm(EMPTY)
      load()
    } catch (err) { toast.show(errorMessage(err), 'error') }
  }

  const remove = async (u) => {
    const ok = await confirm({ title: `Удалить пользователя «${u.full_name}»?`, message: 'Удалить можно только пользователя без заказов. Его отзывы и избранное тоже удалятся.' })
    if (!ok) return
    try {
      await adminApi.removeUser(u.id)
      toast.show('Пользователь удалён')
      if (form.id === u.id) setForm(EMPTY)
      load()
    } catch (err) { toast.show(errorMessage(err), 'error') }
  }

  if (!items) return <Loader />

  return (
    <div className="admin-page">
      <div className="admin-page__head"><h1>Пользователи</h1><span className="muted">{items.length} всего</span></div>
      <div className="toolbar">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по имени, email или телефону" />
      </div>
      <div className="split">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Пользователь</th><th>Телефон</th><th>Роль</th><th className="num">Заказы</th><th className="num">Отзывы</th><th>Регистрация</th><th /></tr></thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.id} className={form.id === u.id ? 'is-selected' : ''}>
                  <td>
                    <div className="user-cell">
                      <span className="avatar">{initials(u.full_name)}</span>
                      <div><b>{u.full_name}</b><div className="muted small">{u.email}</div></div>
                    </div>
                  </td>
                  <td className="nowrap">{u.phone || '—'}</td>
                  <td>{u.role === 'admin' ? <Badge tone="teal">Админ</Badge> : <Badge>Покупатель</Badge>}</td>
                  <td className="num">{u.orders_count}</td>
                  <td className="num">{u.reviews_count}</td>
                  <td className="nowrap">{formatDate(u.created_at)}</td>
                  <td className="actions">
                    <button className="link" onClick={() => setForm({ ...EMPTY, ...u, phone: u.phone || '', password: '' })}>Изменить</button>
                    {u.id !== me.id && <button className="link link--danger" onClick={() => remove(u)}>Удалить</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="panel" onSubmit={save}>
          <h2>{form.id ? 'Редактировать пользователя' : 'Новый пользователь'}</h2>
          <label className="field"><span>ФИО *</span><input required minLength={2} value={form.full_name} onChange={set('full_name')} /></label>
          <label className="field"><span>Email *</span><input type="email" required value={form.email} onChange={set('email')} /></label>
          <label className="field"><span>Телефон</span><input value={form.phone} onChange={set('phone')} placeholder="+992 90 000-00-00" /></label>
          <label className="field"><span>Роль</span>
            <select value={form.role} onChange={set('role')} disabled={form.id === me.id}>
              <option value="user">Покупатель</option>
              <option value="admin">Администратор</option>
            </select>
          </label>
          <label className="field">
            <span>{form.id ? 'Новый пароль' : 'Пароль *'}</span>
            <input type="password" minLength={6} required={!form.id} value={form.password} onChange={set('password')}
              placeholder={form.id ? 'Оставьте пустым, чтобы не менять' : 'Не короче 6 символов'} autoComplete="new-password" />
          </label>
          <div className="form-actions">
            {form.id && <button type="button" className="btn btn--ghost" onClick={() => setForm(EMPTY)}>Отмена</button>}
            <button className="btn btn--primary">{form.id ? 'Сохранить' : 'Создать пользователя'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
