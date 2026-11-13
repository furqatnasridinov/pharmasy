import { useEffect, useState } from 'react'
import { adminApi, categoriesApi } from '../../api'
import { errorMessage } from '../../api/client'
import { Badge } from '../../components/Badges'
import { Loader } from '../../components/States'
import { useConfirm } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
import { formatShortDate } from '../../utils/format'

const today = () => new Date().toISOString().slice(0, 10)
const EMPTY = { id: null, title: '', description: '', discount_percent: '', category_id: '', starts_at: today(), ends_at: '', theme: 'teal', is_active: true }
const THEMES = { teal: 'Бирюзовый', amber: 'Жёлтый', blue: 'Синий' }

function promoState(p) {
  const t = today()
  if (!p.is_active) return ['grey', 'Выключена']
  if (p.starts_at > t) return ['blue', 'Скоро']
  if (p.ends_at && p.ends_at < t) return ['grey', 'Завершена']
  return ['green', 'Активна']
}

export default function Promotions() {
  const toast = useToast()
  const confirm = useConfirm()
  const [items, setItems] = useState(null)
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(EMPTY)

  const load = () => adminApi.promotions().then(setItems).catch((e) => toast.show(errorMessage(e), 'error'))
  useEffect(() => { load(); categoriesApi.list().then(setCategories) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const save = async (e) => {
    e.preventDefault()
    const payload = {
      title: form.title.trim(), description: form.description.trim() || null,
      discount_percent: form.discount_percent ? Number(form.discount_percent) : null,
      category_id: form.category_id ? Number(form.category_id) : null,
      starts_at: form.starts_at, ends_at: form.ends_at || null, theme: form.theme, is_active: form.is_active,
    }
    try {
      if (form.id) await adminApi.updatePromotion(form.id, payload)
      else await adminApi.createPromotion(payload)
      toast.show(form.id ? 'Акция сохранена' : 'Акция создана')
      setForm(EMPTY)
      load()
    } catch (err) { toast.show(errorMessage(err), 'error') }
  }

  const toggle = async (p) => {
    try {
      const { id, ...rest } = p
      await adminApi.updatePromotion(id, { ...rest, is_active: !p.is_active })
      load()
    } catch (err) { toast.show(errorMessage(err), 'error') }
  }

  const remove = async (p) => {
    if (!(await confirm({ title: `Удалить акцию «${p.title}»?` }))) return
    try {
      await adminApi.removePromotion(p.id)
      toast.show('Акция удалена')
      load()
    } catch (err) { toast.show(errorMessage(err), 'error') }
  }

  if (!items) return <Loader />
  const catName = (id) => categories.find((c) => c.id === id)?.name

  return (
    <div className="admin-page">
      <div className="admin-page__head"><h1>Акции</h1></div>
      <div className="split">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Акция</th><th>Период</th><th>Цвет</th><th>Статус</th><th /></tr></thead>
            <tbody>
              {items.map((p) => {
                const [tone, label] = promoState(p)
                return (
                  <tr key={p.id} className={form.id === p.id ? 'is-selected' : ''}>
                    <td><b>{p.title}</b>{p.discount_percent ? ` −${p.discount_percent}%` : ''}
                      <div className="muted small">{p.category_id ? `Категория: ${catName(p.category_id) || '—'}` : 'Без категории'}</div></td>
                    <td className="nowrap">{formatShortDate(p.starts_at)} – {p.ends_at ? formatShortDate(p.ends_at) : 'постоянно'}</td>
                    <td><span className={`swatch swatch--${p.theme}`} /> {THEMES[p.theme]}</td>
                    <td><Badge tone={tone}>{label}</Badge></td>
                    <td className="actions">
                      <button className="link" onClick={() => toggle(p)}>{p.is_active ? 'Выключить' : 'Включить'}</button>
                      <button className="link" onClick={() => setForm({ ...EMPTY, ...p, description: p.description || '',
                        discount_percent: p.discount_percent || '', category_id: p.category_id || '', ends_at: p.ends_at || '' })}>Изменить</button>
                      <button className="link link--danger" onClick={() => remove(p)}>Удалить</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <form className="panel" onSubmit={save}>
          <h2>{form.id ? 'Редактировать акцию' : 'Новая акция'}</h2>
          <label className="field"><span>Название *</span><input required minLength={2} value={form.title} onChange={set('title')} /></label>
          <label className="field"><span>Описание</span><textarea rows={2} value={form.description} onChange={set('description')} /></label>
          <div className="form-grid">
            <label className="field"><span>Скидка, %</span><input type="number" min="1" max="90" value={form.discount_percent} onChange={set('discount_percent')} /></label>
            <label className="field"><span>Цвет баннера</span>
              <select value={form.theme} onChange={set('theme')}>{Object.entries(THEMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </label>
            <label className="field"><span>Начало *</span><input required type="date" value={form.starts_at} onChange={set('starts_at')} /></label>
            <label className="field"><span>Окончание</span><input type="date" value={form.ends_at} onChange={set('ends_at')} /></label>
          </div>
          <label className="field"><span>Категория (ссылка «Выбрать»)</span>
            <select value={form.category_id} onChange={set('category_id')}>
              <option value="">Без категории</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="check"><input type="checkbox" checked={form.is_active} onChange={set('is_active')} /> Акция активна</label>
          <div className="form-actions">
            {form.id && <button type="button" className="btn btn--ghost" onClick={() => setForm(EMPTY)}>Отмена</button>}
            <button className="btn btn--primary">{form.id ? 'Сохранить' : 'Создать акцию'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
