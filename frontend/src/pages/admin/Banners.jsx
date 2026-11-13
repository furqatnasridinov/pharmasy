import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../api'
import { errorMessage } from '../../api/client'
import { Badge } from '../../components/Badges'
import { BannerCard } from '../../components/HomeBanners'
import { Loader } from '../../components/States'
import { useConfirm } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
import { formatShortDate } from '../../utils/format'

const MAX_MB = 5
const today = () => new Date().toISOString().slice(0, 10)
const EMPTY = {
  id: null, title: '', subtitle: '', image_url: '', show_text: true, link_url: '', placement: 'slider',
  theme: 'teal', sort_order: 1, starts_at: '', ends_at: '', is_active: true,
}
const PLACEMENTS = { slider: 'Слайдер (большой)', side: 'Малый справа' }
const THEMES = { teal: 'Бирюзовый', amber: 'Жёлтый', blue: 'Синий' }
const SIZE_HINT = { slider: '1600 × 760 px', side: '800 × 440 px' }

function bannerState(b) {
  const t = today()
  if (!b.is_active) return ['grey', 'Выключен']
  if (b.starts_at && b.starts_at > t) return ['blue', 'Скоро']
  if (b.ends_at && b.ends_at < t) return ['grey', 'Завершён']
  return ['green', 'Показывается']
}

function period(b) {
  if (!b.starts_at && !b.ends_at) return 'всегда'
  return `${b.starts_at ? formatShortDate(b.starts_at) : '…'} – ${b.ends_at ? formatShortDate(b.ends_at) : '…'}`
}

const toPayload = (f) => ({
  title: f.title, subtitle: f.subtitle || null, image_url: f.image_url || null, show_text: f.show_text, link_url: f.link_url || null,
  placement: f.placement, theme: f.theme, sort_order: Number(f.sort_order) || 0,
  starts_at: f.starts_at || null, ends_at: f.ends_at || null, is_active: f.is_active,
})

export default function Banners() {
  const toast = useToast()
  const confirm = useConfirm()
  const [items, setItems] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () => adminApi.banners().then(setItems).catch((e) => toast.show(errorMessage(e), 'error'))
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const filePreview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => { if (filePreview) URL.revokeObjectURL(filePreview) }, [filePreview])

  const reset = () => { setForm(EMPTY); setFile(null) }

  const startNew = () => {
    const next = Math.max(0, ...(items || []).filter((b) => b.placement === 'slider').map((b) => b.sort_order)) + 1
    setFile(null)
    setForm({ ...EMPTY, sort_order: next })
  }

  const edit = (b) => {
    setFile(null)
    setForm({ ...EMPTY, ...b, subtitle: b.subtitle || '', image_url: b.image_url || '', link_url: b.link_url || '',
      starts_at: b.starts_at || '', ends_at: b.ends_at || '' })
  }

  const pickFile = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return toast.show('Допустимы только JPG, PNG или WEBP', 'error')
    if (f.size > MAX_MB * 1024 * 1024) return toast.show(`Файл больше ${MAX_MB} МБ`, 'error')
    setFile(f)
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      let saved = form.id
        ? await adminApi.updateBanner(form.id, toPayload(form))
        : await adminApi.createBanner(toPayload(form))
      if (file) saved = await adminApi.uploadBannerImage(saved.id, file)
      toast.show(form.id ? 'Баннер сохранён' : 'Баннер создан')
      reset()
      load()
    } catch (err) {
      toast.show(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const patch = async (b, changes) => {
    try {
      await adminApi.updateBanner(b.id, toPayload({ ...b, ...changes }))
      load()
    } catch (err) { toast.show(errorMessage(err), 'error') }
  }

  /** Поменять местами с соседним баннером того же места. */
  const move = async (b, dir) => {
    const group = items.filter((x) => x.placement === b.placement)
    const i = group.findIndex((x) => x.id === b.id)
    const other = group[i + dir]
    if (!other) return
    // Если порядки совпадают, разводим их, чтобы перестановка была видна
    const [a, c] = other.sort_order === b.sort_order ? [b.sort_order + dir, b.sort_order] : [other.sort_order, b.sort_order]
    try {
      await adminApi.updateBanner(b.id, toPayload({ ...b, sort_order: Math.max(0, a) }))
      await adminApi.updateBanner(other.id, toPayload({ ...other, sort_order: Math.max(0, c) }))
      load()
    } catch (err) { toast.show(errorMessage(err), 'error') }
  }

  const remove = async (b) => {
    if (!(await confirm({ title: `Удалить баннер «${b.title}»?`, message: 'Баннер пропадёт с главной страницы.' }))) return
    try {
      await adminApi.removeBanner(b.id)
      toast.show('Баннер удалён')
      if (form.id === b.id) reset()
      load()
    } catch (err) { toast.show(errorMessage(err), 'error') }
  }

  if (!items) return <Loader />

  const preview = { ...form, title: form.title || 'Заголовок баннера', image_url: filePreview || form.image_url }

  const rows = (placement) => {
    const group = items.filter((b) => b.placement === placement)
    if (!group.length) return <tr><td colSpan={4} className="muted">Нет баннеров</td></tr>
    return group.map((b, i) => {
      const [tone, label] = bannerState(b)
      return (
        <tr key={b.id} className={form.id === b.id ? 'is-selected' : ''}>
          <td className="order-cell">
            <span className="order-btns">
              <button className="icon-btn" disabled={i === 0} onClick={() => move(b, -1)} aria-label="Выше" title="Выше">↑</button>
              <button className="icon-btn" disabled={i === group.length - 1} onClick={() => move(b, 1)} aria-label="Ниже" title="Ниже">↓</button>
            </span>
          </td>
          <td className="banner-thumb-cell"><BannerCard banner={b} className="hb--thumb" /></td>
          <td className="banner-info"><b>{b.title}</b>
            <div className="muted small">{b.link_url ? `→ ${b.link_url}` : 'Без ссылки'} · {period(b)}</div>
            <div className="banner-info__row">
              <Badge tone={tone}>{label}</Badge>
              <button className="link" onClick={() => patch(b, { is_active: !b.is_active })}>{b.is_active ? 'Выключить' : 'Включить'}</button>
            </div></td>
          <td className="actions">
            <button className="link" onClick={() => edit(b)}>Изменить</button>
            <button className="link link--danger" onClick={() => remove(b)}>Удалить</button>
          </td>
        </tr>
      )
    })
  }

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <h1>Баннеры</h1>
        <button className="btn btn--primary" onClick={startNew}>Новый баннер</button>
      </div>
      <div className="split split--wide">
        <div className="banner-tables">
          {['slider', 'side'].map((p) => (
            <div key={p}>
              <h2 className="banner-tables__title">{PLACEMENTS[p]}
                <small>{p === 'slider' ? 'листаются по кругу' : 'видны первые два'}</small></h2>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th /><th>Вид</th><th>Баннер</th><th /></tr></thead>
                  <tbody>{rows(p)}</tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <form className="panel" onSubmit={save}>
          <h2>{form.id ? 'Редактировать баннер' : 'Новый баннер'}</h2>
          <div className={`banner-preview banner-preview--${form.placement}`}>
            <BannerCard banner={{ ...preview, link_url: null }} />
          </div>
          <label className="field"><span>Место на главной</span>
            <select value={form.placement} onChange={set('placement')}>
              {Object.entries(PLACEMENTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="field"><span>Заголовок *</span>
            <input required minLength={2} maxLength={200} value={form.title} onChange={set('title')} /></label>
          <label className="field"><span>Подзаголовок</span>
            <input maxLength={300} value={form.subtitle} onChange={set('subtitle')} /></label>

          <div className="field">
            <span>Картинка</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} />
            <small className="muted">Рекомендуемый размер {SIZE_HINT[form.placement]}, JPG / PNG / WEBP до {MAX_MB} МБ.
              Без картинки баннер рисуется цветом фона.</small>
            <input value={form.image_url} onChange={set('image_url')} placeholder="или ссылка: https://… или /uploads/…" disabled={Boolean(file)} />
            {(file || form.image_url) && (
              <button type="button" className="link link--danger" style={{ alignSelf: 'flex-start' }}
                onClick={() => { setFile(null); setForm({ ...form, image_url: '' }) }}>Убрать картинку</button>
            )}
            {(file || form.image_url) && (
              <label className="check" style={{ marginBottom: 0 }}>
                <input type="checkbox" checked={form.show_text} onChange={set('show_text')} />
                Заголовок и подзаголовок поверх картинки
              </label>
            )}
            {(file || form.image_url) && !form.show_text && (
              <small className="muted">Картинка показывается целиком — текст должен быть на ней самой.</small>
            )}
          </div>

          <div className="form-grid">
            <label className="field"><span>Цвет фона</span>
              <select value={form.theme} onChange={set('theme')}>{Object.entries(THEMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </label>
            <label className="field"><span>Порядок</span>
              <input type="number" min="0" max="999" value={form.sort_order} onChange={set('sort_order')} /></label>
          </div>
          <label className="field"><span>Ссылка при клике</span>
            <input value={form.link_url} onChange={set('link_url')} placeholder="/catalog?on_sale=true или https://…" /></label>
          <div className="form-grid">
            <label className="field"><span>Показывать с</span><input type="date" value={form.starts_at} onChange={set('starts_at')} /></label>
            <label className="field"><span>по</span><input type="date" value={form.ends_at} onChange={set('ends_at')} /></label>
          </div>
          <label className="check"><input type="checkbox" checked={form.is_active} onChange={set('is_active')} /> Показывать на сайте</label>
          <div className="form-actions">
            {(form.id || form.title) && <button type="button" className="btn btn--ghost" onClick={reset}>Отмена</button>}
            <button className="btn btn--primary" disabled={busy}>{busy ? 'Сохраняем…' : form.id ? 'Сохранить' : 'Создать баннер'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
