import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { categoriesApi, medicinesApi } from '../../api'
import { errorMessage } from '../../api/client'
import { Badge } from '../../components/Badges'
import MedicineImage from '../../components/MedicineImage'
import Pagination from '../../components/Pagination'
import { EmptyState, Loader } from '../../components/States'
import { useConfirm } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
import { formatPrice, formatShortDate } from '../../utils/format'

const FORMS = ['таблетки', 'капсулы', 'драже', 'сироп', 'суспензия', 'капли назальные', 'капли глазные', 'мазь', 'крем',
  'гель', 'спрей', 'порошок', 'раствор', 'раствор для инъекций', 'суппозитории ректальные']
const MAX_MB = 5

const emptyForm = (categoryId) => ({
  name: '', description: '', category_id: categoryId || '', manufacturer: '', active_substance: '', form: 'таблетки',
  dosage: '', package: '', price: '', stock: 0, expiry_date: '', requires_prescription: false, image_url: '',
  discount_percent: 0, is_deal_of_day: false,
})

function StockInput({ medicine, onSaved }) {
  const toast = useToast()
  const [value, setValue] = useState(medicine.stock)
  useEffect(() => { setValue(medicine.stock) }, [medicine.stock])
  const save = async () => {
    const n = Number(value)
    if (n === medicine.stock) return
    if (!Number.isInteger(n) || n < 0) { setValue(medicine.stock); return toast.show('Остаток — целое число от 0', 'error') }
    try {
      onSaved(await medicinesApi.updateStock(medicine.id, n))
      toast.show(`Остаток «${medicine.name}»: ${n} шт.`)
    } catch (e) { toast.show(errorMessage(e), 'error'); setValue(medicine.stock) }
  }
  return (
    <input className="stock-input" type="number" min="0" value={value} aria-label={`Остаток ${medicine.name}`}
      onChange={(e) => setValue(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
  )
}

function MedicineForm({ initial, categories, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(initial)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const pickFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return toast.show('Допустимы только JPG, PNG или WEBP', 'error')
    if (f.size > MAX_MB * 1024 * 1024) return toast.show(`Файл больше ${MAX_MB} МБ`, 'error')
    setFile(f)
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const payload = {
      ...form,
      category_id: Number(form.category_id),
      price: Number(form.price),
      stock: Number(form.stock),
      discount_percent: Number(form.discount_percent) || 0,
      description: form.description || null,
      manufacturer: form.manufacturer || null,
      active_substance: form.active_substance || null,
      dosage: form.dosage || null,
      package: form.package || null,
      image_url: form.image_url || null,
    }
    delete payload.id
    try {
      let saved = form.id ? await medicinesApi.update(form.id, payload) : await medicinesApi.create(payload)
      if (file) saved = await medicinesApi.uploadImage(saved.id, file)
      toast.show(form.id ? 'Препарат сохранён' : 'Препарат добавлен')
      onSaved(saved)
    } catch (err) {
      toast.show(errorMessage(err), 'error')
      setBusy(false)
    }
  }

  const preview = file ? URL.createObjectURL(file) : form.image_url

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal modal--wide" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <h3>{form.id ? `Редактирование: ${initial.name}` : 'Новый препарат'}</h3>
        <div className="form-grid">
          <label className="field span-2"><span>Название *</span><input required value={form.name} onChange={set('name')} /></label>
          <label className="field"><span>Категория *</span>
            <select required value={form.category_id} onChange={set('category_id')}>
              <option value="">Выберите…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Форма выпуска *</span>
            <input required list="forms" value={form.form} onChange={set('form')} />
            <datalist id="forms">{FORMS.map((f) => <option key={f} value={f} />)}</datalist>
          </label>
          <label className="field"><span>Действующее вещество</span><input value={form.active_substance} onChange={set('active_substance')} /></label>
          <label className="field"><span>Производитель</span><input value={form.manufacturer} onChange={set('manufacturer')} /></label>
          <label className="field"><span>Дозировка</span><input value={form.dosage} onChange={set('dosage')} placeholder="500 мг" /></label>
          <label className="field"><span>Упаковка</span><input value={form.package} onChange={set('package')} placeholder="20 таблеток" /></label>
          <label className="field"><span>Цена, смн *</span><input required type="number" min="0.01" step="0.01" value={form.price} onChange={set('price')} /></label>
          <label className="field"><span>Скидка, %</span><input type="number" min="0" max="90" value={form.discount_percent} onChange={set('discount_percent')} /></label>
          <label className="field"><span>Остаток, шт. *</span><input required type="number" min="0" value={form.stock} onChange={set('stock')} /></label>
          <label className="field"><span>Срок годности *</span><input required type="date" value={form.expiry_date} onChange={set('expiry_date')} /></label>
          <label className="check"><input type="checkbox" checked={form.requires_prescription} onChange={set('requires_prescription')} /> По рецепту</label>
          <label className="check"><input type="checkbox" checked={form.is_deal_of_day} onChange={set('is_deal_of_day')} /> Товар дня («Выгодно сегодня»)</label>
          <label className="field span-2"><span>Описание</span><textarea rows={4} value={form.description} onChange={set('description')} /></label>
          <div className="field span-2 image-field">
            <span>Изображение</span>
            <div className="image-field__row">
              <MedicineImage src={preview} alt={form.name} className="image-field__preview" />
              <div className="image-field__inputs">
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} />
                <small className="muted">JPG, PNG или WEBP до {MAX_MB} МБ. Либо ссылка на картинку:</small>
                <input value={form.image_url} onChange={set('image_url')} placeholder="https://… или /uploads/…" />
              </div>
            </div>
          </div>
        </div>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Отмена</button>
          <button className="btn btn--primary" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}</button>
        </div>
      </form>
    </div>
  )
}

export default function Medicines() {
  const toast = useToast()
  const confirm = useConfirm()
  const [params, setParams] = useSearchParams()
  const [categories, setCategories] = useState([])
  const [data, setData] = useState(null)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState(params.get('search') || '')

  const categoryId = params.get('category_id') || ''
  const page = Number(params.get('page') || 1)

  const load = useCallback(() => {
    const q = { page, page_size: 20, sort: 'name' }
    if (params.get('search')) q.search = params.get('search')
    if (categoryId) q.category_id = categoryId
    medicinesApi.list(q).then(setData).catch((e) => toast.show(errorMessage(e), 'error'))
  }, [params]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])
  useEffect(() => { categoriesApi.list().then(setCategories).catch(() => {}) }, [])

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  const replaceItem = (m) => setData((d) => ({ ...d, items: d.items.map((x) => (x.id === m.id ? m : x)) }))

  const remove = async (m) => {
    const ok = await confirm({ title: `Удалить «${m.name}»?`, message: 'Препарат будет удалён из каталога вместе с отзывами.' })
    if (!ok) return
    try {
      await medicinesApi.remove(m.id)
      toast.show('Препарат удалён')
      load()
    } catch (e) { toast.show(errorMessage(e), 'error') }
  }

  const openEdit = (m) => setEditing({
    ...emptyForm(), ...m,
    description: m.description || '', manufacturer: m.manufacturer || '', active_substance: m.active_substance || '',
    dosage: m.dosage || '', package: m.package || '', image_url: m.image_url || '',
  })

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <h1>Лекарства</h1>
        <button className="btn btn--primary" onClick={() => setEditing(emptyForm(categoryId))}>+ Добавить препарат</button>
      </div>

      <div className="toolbar">
        <form onSubmit={(e) => { e.preventDefault(); setParam('search', search.trim()) }}>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию"
            onBlur={() => setParam('search', search.trim())} />
        </form>
        <select value={categoryId} onChange={(e) => setParam('category_id', e.target.value)} aria-label="Категория">
          <option value="">Все категории</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="legend"><i className="legend__red" /> просрочено <i className="legend__amber" /> истекает</span>
      </div>

      {!data ? <Loader /> : data.items.length === 0 ? <EmptyState icon="🔍" title="Ничего не найдено" /> : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th /><th>Название</th><th>Категория</th><th className="num">Цена</th><th>Остаток</th><th>Годен до</th><th /></tr>
              </thead>
              <tbody>
                {data.items.map((m) => (
                  <tr key={m.id} className={`exp-${m.expiry_status}`}>
                    <td><MedicineImage src={m.image_url} alt={m.name} className="table__img" /></td>
                    <td>
                      <b>{m.name}</b>
                      <div className="muted small">{[m.form, m.dosage, m.manufacturer].filter(Boolean).join(' · ')}</div>
                      <div className="table__badges">
                        {m.requires_prescription && <Badge tone="rx">По рецепту</Badge>}
                        {m.is_deal_of_day && <Badge tone="teal">Товар дня</Badge>}
                        {m.discount_percent > 0 && <Badge tone="sale">−{m.discount_percent}%</Badge>}
                      </div>
                    </td>
                    <td>{m.category_name}</td>
                    <td className="num">{formatPrice(m.final_price)}{m.discount_percent > 0 && <s className="muted small"><br />{formatPrice(m.price)}</s>}</td>
                    <td><StockInput medicine={m} onSaved={replaceItem} />{m.stock < 5 && <Badge tone={m.stock === 0 ? 'red' : 'amber'}>{m.stock === 0 ? 'Нет' : 'Мало'}</Badge>}</td>
                    <td>
                      {formatShortDate(m.expiry_date)}
                      {m.expiry_status === 'expired' && <Badge tone="red">Просрочено</Badge>}
                      {m.expiry_status === 'expiring' && <Badge tone="amber">Истекает</Badge>}
                    </td>
                    <td className="actions">
                      <button className="link" onClick={() => openEdit(m)}>Изменить</button>
                      <button className="link link--danger" onClick={() => remove(m)}>Удалить</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="catalog__pager">
            <span>Всего: {data.total}</span>
            <Pagination page={data.page} pages={data.pages} onChange={(p) => setParam('page', p)} />
          </div>
        </>
      )}

      {editing && (
        <MedicineForm initial={editing} categories={categories} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }} />
      )}
    </div>
  )
}
