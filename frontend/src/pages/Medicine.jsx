import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { medicinesApi, reviewsApi } from '../api'
import { errorMessage } from '../api/client'
import { MedicineBadges } from '../components/Badges'
import { ArrowLeftIcon, HeartIcon } from '../components/Icons'
import MedicineImage from '../components/MedicineImage'
import Price from '../components/Price'
import QuantityControl from '../components/QuantityControl'
import StarRating from '../components/StarRating'
import { ErrorState, Loader } from '../components/States'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useConfirm } from '../context/ConfirmContext'
import { useFavorites } from '../context/FavoritesContext'
import { useToast } from '../context/ToastContext'
import { formatDate, formatShortDate, plural } from '../utils/format'

function ReviewForm({ initial, onSubmit, onCancel }) {
  const [rating, setRating] = useState(initial?.rating || 0)
  const [text, setText] = useState(initial?.text || '')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (!rating) return
    setBusy(true)
    try { await onSubmit({ rating, text }) } finally { setBusy(false) }
  }
  return (
    <form className="review-form" onSubmit={submit}>
      <div className="review-form__stars"><span>Ваша оценка</span><StarRating value={rating} onChange={setRating} size={26} /></div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3}
        placeholder="Расскажите, помог ли препарат, были ли побочные эффекты" />
      <div className="review-form__actions">
        {onCancel && <button type="button" className="btn btn--ghost" onClick={onCancel}>Отмена</button>}
        <button className="btn btn--primary" disabled={!rating || busy}>{initial ? 'Сохранить отзыв' : 'Опубликовать отзыв'}</button>
      </div>
    </form>
  )
}

export default function Medicine() {
  const { id } = useParams()
  const { user, isAdmin } = useAuth()
  const cart = useCart()
  const fav = useFavorites()
  const toast = useToast()
  const confirm = useConfirm()
  const [med, setMed] = useState(null)
  const [reviews, setReviews] = useState([])
  const [error, setError] = useState('')
  const [qty, setQty] = useState(1)
  const [editing, setEditing] = useState(false)

  const load = useCallback(() => {
    setError('')
    Promise.all([medicinesApi.get(id), reviewsApi.list(id)])
      .then(([m, r]) => { setMed(m); setReviews(r); setQty(1) })
      .catch((e) => setError(errorMessage(e)))
  }, [id])
  useEffect(() => { load() }, [load])

  if (error) return <div className="container page"><ErrorState text={error} onRetry={load} /></div>
  if (!med) return <Loader />

  const inCart = cart.quantityOf(med.id)
  const maxQty = Math.max(0, med.stock - inCart)
  const myReview = user && reviews.find((r) => r.user_id === user.id)
  const isFav = fav.isFavorite(med.id)

  const addToCart = () => {
    const added = cart.add(med, qty)
    if (added) toast.show(`«${med.name}» × ${added} добавлен в корзину`)
    else toast.show(`В корзине уже всё, что есть в наличии (${med.stock} шт.)`, 'info')
    setQty(1)
  }

  const refreshMed = () => medicinesApi.get(id).then(setMed)

  const saveReview = async (payload) => {
    try {
      if (myReview) {
        const updated = await reviewsApi.update(myReview.id, payload)
        setReviews((list) => list.map((r) => (r.id === updated.id ? updated : r)))
        toast.show('Отзыв сохранён')
      } else {
        const created = await reviewsApi.create(med.id, payload)
        setReviews((list) => [created, ...list])
        toast.show('Спасибо! Отзыв опубликован')
      }
      setEditing(false)
      refreshMed()
    } catch (e) { toast.show(errorMessage(e), 'error') }
  }

  const deleteReview = async (review) => {
    const ok = await confirm({ title: 'Удалить отзыв?', message: 'Отзыв будет удалён без возможности восстановления.' })
    if (!ok) return
    try {
      await reviewsApi.remove(review.id)
      setReviews((list) => list.filter((r) => r.id !== review.id))
      toast.show('Отзыв удалён')
      refreshMed()
    } catch (e) { toast.show(errorMessage(e), 'error') }
  }

  const specs = [
    ['Действующее вещество', med.active_substance],
    ['Форма выпуска', med.form],
    ['Дозировка', med.dosage],
    ['Упаковка', med.package],
    ['Производитель', med.manufacturer],
    ['Страна', med.country],
    ['Категория', med.category_name],
    ['Срок годности', `до ${formatShortDate(med.expiry_date)}`],
  ].filter(([, v]) => v)

  return (
    <div className="container page medicine">
      <div className="medicine__nav">
        <Link to="/catalog" className="back-link"><ArrowLeftIcon size={18} /> Каталог</Link>
        {isAdmin && (
          <div className="admin-bar">
            <span>Вы администратор</span>
            <Link to={`/admin/medicines?edit=${med.id}`} className="btn btn--dark">Редактировать препарат</Link>
            <Link to="/admin/reviews" className="btn btn--line">Отзывы</Link>
          </div>
        )}
      </div>
      <div className="medicine__top">
        <div className="medicine__media">
          <MedicineImage src={med.image_url} alt={med.name} />
          {med.discount_percent > 0 && <span className="off off--lg">−{med.discount_percent}%</span>}
        </div>

        <div className="medicine__info">
          <Link to={`/catalog?category_id=${med.category_id}`} className="medicine__cat">{med.category_name}</Link>
          <h1>{med.name}</h1>
          <p className="medicine__sub">{[med.form, med.dosage, med.package].filter(Boolean).join(' · ')}</p>
          {med.active_substance && (
            <Link className="product__analogs" to={`/catalog?substance=${encodeURIComponent(med.active_substance)}`}>Показать аналоги ›</Link>
          )}
          <div className="medicine__rating">
            <StarRating value={med.rating} size={16} />
            <a href="#reviews">{med.reviews_count} {plural(med.reviews_count, ['отзыв', 'отзыва', 'отзывов'])}</a>
          </div>
          <div className="medicine__badges"><MedicineBadges medicine={med} /></div>

          {med.requires_prescription && (
            <div className="alert alert--rx"><b>Препарат отпускается по рецепту врача.</b> Покажите рецепт провизору при получении заказа.</div>
          )}
          {med.expiry_status === 'expired' && (
            <div className="alert alert--red">Срок годности истёк {formatDate(med.expiry_date)}. Препарат недоступен для заказа.</div>
          )}

          <div className="buy-box">
            <Price medicine={med} size="xl" />
            <p className={`buy-box__stock ${med.stock > 0 && med.stock < 5 ? 'is-low' : ''}`}>
              {!med.is_available ? (med.expiry_status === 'expired' ? 'Недоступно' : 'Нет в наличии')
                : med.stock < 5 ? `Осталось всего ${med.stock} шт.` : `В наличии ${med.stock} шт.`}
              {inCart > 0 && ` · в корзине ${inCart} шт.`}
            </p>
            <div className="buy-box__actions">
              {med.is_available && maxQty > 0 && <QuantityControl value={qty} min={1} max={maxQty} onChange={setQty} />}
              <button className="btn btn--primary btn--lg" disabled={!med.is_available || maxQty === 0} onClick={addToCart}>
                {!med.is_available ? 'Недоступно' : maxQty === 0 ? 'Всё уже в корзине' : 'В корзину'}
              </button>
              <button className={`btn btn--line btn--lg fav-toggle ${isFav ? 'is-on' : ''}`} onClick={() => fav.toggle(med)} aria-pressed={isFav}>
                <HeartIcon size={18} filled={isFav} /> {isFav ? 'В избранном' : 'В избранное'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="medicine__body">
        <section>
          <h2>Описание</h2>
          {med.description?.split('\n\n').map((p) => <p key={p}>{p}</p>)}
        </section>
        <section>
          <h2>Характеристики</h2>
          <dl className="specs">{specs.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </section>
      </div>

      <section className="reviews" id="reviews">
        <div className="reviews__head">
          <h2>Отзывы</h2>
          <div className="reviews__summary">
            <b>{med.rating ? med.rating.toFixed(1).replace('.', ',') : '—'}</b>
            <div><StarRating value={med.rating} size={18} /><span>{med.reviews_count} {plural(med.reviews_count, ['отзыв', 'отзыва', 'отзывов'])}</span></div>
          </div>
        </div>

        {!user && <p className="reviews__login"><Link to="/login" state={{ from: `/medicines/${med.id}` }}>Войдите</Link>, чтобы оставить отзыв.</p>}
        {user && !myReview && <ReviewForm onSubmit={saveReview} />}
        {user && myReview && editing && <ReviewForm initial={myReview} onSubmit={saveReview} onCancel={() => setEditing(false)} />}

        {reviews.length === 0 ? <p className="muted">Отзывов пока нет — станьте первым.</p> : (
          <ul className="review-list">
            {reviews.map((r) => (
              <li key={r.id} className={r.user_id === user?.id ? 'is-mine' : ''}>
                <div className="review-list__head">
                  <b>{r.user_name}</b><StarRating value={r.rating} size={14} />
                  <time>{formatDate(r.created_at)}</time>
                </div>
                {r.text && <p>{r.text}</p>}
                {(r.user_id === user?.id || isAdmin) && (
                  <div className="review-list__actions">
                    {r.user_id === user?.id && !editing && <button className="link" onClick={() => setEditing(true)}>Изменить</button>}
                    <button className="link link--danger" onClick={() => deleteReview(r)}>Удалить</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
