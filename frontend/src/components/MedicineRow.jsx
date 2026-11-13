import { Link } from 'react-router-dom'
import { useFavorites } from '../context/FavoritesContext'
import { MedicineBadges } from './Badges'
import CartButton from './CartButton'
import { HeartIcon } from './Icons'
import MedicineImage from './MedicineImage'
import Price from './Price'
import StarRating from './StarRating'

const STOCK_SCALE = 100 // остаток, при котором полоска заполнена полностью

function StockMeter({ medicine: m }) {
  if (m.expiry_status === 'expired') return <div className="meter"><span>Недоступно для заказа</span><i style={{ '--w': '0%' }} /></div>
  if (m.stock === 0) return <div className="meter"><span>Нет в наличии</span><i style={{ '--w': '0%' }} /></div>
  const low = m.stock < 5
  return (
    <div className={`meter ${low ? 'meter--low' : ''}`}>
      <span>{low ? `Осталось ${m.stock} шт.` : `${m.stock} шт. на складе`}</span>
      <i style={{ '--w': `${Math.max(6, Math.min(100, (m.stock / STOCK_SCALE) * 100))}%` }} />
    </div>
  )
}

export default function MedicineRow({ medicine: m }) {
  const fav = useFavorites()
  const isFav = fav.isFavorite(m.id)
  const meta = [m.form, m.dosage, m.manufacturer].filter(Boolean).join(' · ')

  return (
    <article className={`row ${m.is_available ? '' : 'row--dim'}`}>
      <Link to={`/medicines/${m.id}`} className="row__thumb"><MedicineImage src={m.image_url} alt={m.name} /></Link>
      <div className="row__info">
        <div className="row__name">
          <Link to={`/medicines/${m.id}`}>{m.name}</Link>
          <MedicineBadges medicine={m} showStock={false} showDiscount />
        </div>
        <div className="row__meta">{meta}</div>
        <StarRating value={m.rating} count={m.reviews_count} size={13} />
      </div>
      <StockMeter medicine={m} />
      <div className="row__price"><Price medicine={m} muted={!m.is_available} /></div>
      <div className="row__cart"><CartButton medicine={m} block /></div>
      <button className={`fav-btn ${isFav ? 'is-on' : ''}`} onClick={() => fav.toggle(m)}
        aria-pressed={isFav} aria-label={isFav ? 'Убрать из избранного' : 'В избранное'}>
        <HeartIcon size={18} filled={isFav} />
      </button>
    </article>
  )
}
