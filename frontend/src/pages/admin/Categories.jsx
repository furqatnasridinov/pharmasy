import { useEffect, useState } from 'react'
import { categoriesApi } from '../../api'
import { errorMessage } from '../../api/client'
import { Loader } from '../../components/States'
import { useConfirm } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'

const EMPTY = { id: null, name: '', description: '' }

export default function Categories() {
  const toast = useToast()
  const confirm = useConfirm()
  const [items, setItems] = useState(null)
  const [form, setForm] = useState(EMPTY)

  const load = () => categoriesApi.list().then(setItems).catch((e) => toast.show(errorMessage(e), 'error'))
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault()
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() || null }
      if (form.id) await categoriesApi.update(form.id, payload)
      else await categoriesApi.create(payload)
      toast.show(form.id ? 'Категория сохранена' : 'Категория создана')
      setForm(EMPTY)
      load()
    } catch (err) { toast.show(errorMessage(err), 'error') }
  }

  const remove = async (c) => {
    const ok = await confirm({ title: `Удалить категорию «${c.name}»?`, message: 'Удалить можно только пустую категорию.' })
    if (!ok) return
    try {
      await categoriesApi.remove(c.id)
      toast.show('Категория удалена')
      load()
    } catch (err) { toast.show(errorMessage(err), 'error') }
  }

  if (!items) return <Loader />

  return (
    <div className="admin-page">
      <div className="admin-page__head"><h1>Категории</h1></div>
      <div className="split">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Название</th><th>Описание</th><th className="num">Препаратов</th><th /></tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className={form.id === c.id ? 'is-selected' : ''}>
                  <td><b>{c.name}</b></td>
                  <td className="muted">{c.description}</td>
                  <td className="num">{c.medicines_count}</td>
                  <td className="actions">
                    <button className="link" onClick={() => setForm({ id: c.id, name: c.name, description: c.description || '' })}>Изменить</button>
                    <button className="link link--danger" onClick={() => remove(c)}>Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="panel" onSubmit={save}>
          <h2>{form.id ? 'Редактировать категорию' : 'Новая категория'}</h2>
          <label className="field"><span>Название *</span>
            <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="field"><span>Описание</span>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <div className="form-actions">
            {form.id && <button type="button" className="btn btn--ghost" onClick={() => setForm(EMPTY)}>Отмена</button>}
            <button className="btn btn--primary">{form.id ? 'Сохранить' : 'Создать категорию'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
