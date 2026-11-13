import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, reviewsApi } from '../../api'
import { errorMessage } from '../../api/client'
import StarRating from '../../components/StarRating'
import { EmptyState, Loader } from '../../components/States'
import { useConfirm } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
import { formatDate } from '../../utils/format'

export default function Reviews() {
  const toast = useToast()
  const confirm = useConfirm()
  const [items, setItems] = useState(null)
  const [rating, setRating] = useState('')
  const [editing, setEditing] = useState(null) // { id, rating, text }

  const saveEdit = async () => {
    try {
      const updated = await adminApi.updateReview(editing.id, { rating: editing.rating, text: editing.text })
      setItems((list) => list.map((r) => (r.id === updated.id ? updated : r)))
      setEditing(null)
      toast.show('Отзыв сохранён')
    } catch (e) { toast.show(errorMessage(e), 'error') }
  }

  useEffect(() => { adminApi.reviews().then(setItems).catch((e) => toast.show(errorMessage(e), 'error')) }, [toast])

  const visible = useMemo(() => (items || []).filter((r) => !rating || r.rating === Number(rating)), [items, rating])

  const remove = async (r) => {
    const ok = await confirm({ title: 'Удалить отзыв?', message: `Отзыв «${r.user_name}» о «${r.medicine_name}» будет удалён.` })
    if (!ok) return
    try {
      await reviewsApi.remove(r.id)
      setItems((list) => list.filter((x) => x.id !== r.id))
      toast.show('Отзыв удалён')
    } catch (e) { toast.show(errorMessage(e), 'error') }
  }

  if (!items) return <Loader />

  return (
    <div className="admin-page">
      <div className="admin-page__head"><h1>Отзывы</h1><span className="muted">{items.length} всего</span></div>
      <div className="toolbar">
        <select value={rating} onChange={(e) => setRating(e.target.value)} aria-label="Оценка">
          <option value="">Все оценки</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
        </select>
      </div>
      {visible.length === 0 ? <EmptyState icon="💬" title="Отзывов нет" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Дата</th><th>Препарат</th><th>Автор</th><th>Оценка</th><th>Текст</th><th /></tr></thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td className="nowrap">{formatDate(r.created_at)}</td>
                  <td><Link to={`/medicines/${r.medicine_id}`}>{r.medicine_name}</Link></td>
                  <td>{r.user_name}</td>
                  {editing?.id === r.id ? (
                    <>
                      <td><StarRating value={editing.rating} onChange={(v) => setEditing({ ...editing, rating: v })} size={16} /></td>
                      <td><textarea className="inline-input" rows={2} value={editing.text || ''} onChange={(e) => setEditing({ ...editing, text: e.target.value })} /></td>
                      <td className="actions">
                        <button className="link" onClick={saveEdit}>Сохранить</button>
                        <button className="link" onClick={() => setEditing(null)}>Отмена</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td><StarRating value={r.rating} size={13} /></td>
                      <td className="muted">{r.text}</td>
                      <td className="actions">
                        <button className="link" onClick={() => setEditing({ id: r.id, rating: r.rating, text: r.text || '' })}>Изменить</button>
                        <button className="link link--danger" onClick={() => remove(r)}>Удалить</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
