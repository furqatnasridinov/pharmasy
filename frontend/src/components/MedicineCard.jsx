import { Link } from 'react-router-dom'
import { useFavorites } from '../context/FavoritesContext'
import { MedicineBadges } from './Badges'
import CartButton from './CartButton'
import { HeartIcon } from './Icons'
import MedicineImage from './MedicineImage'
import Price from './Price'
import StarRating from './StarRating'

/** Карточка для сеток: хиты, товары дня, избранное. variant="deal" показывает остаток полоской. */
export default function MedicineCard({ medicine: m, variant = 'default' }) {
  const fav = useFavorites()
  const isFav = fav.isFavorite(m.id)
  return (
    <article className={`card ${variant === 'deal' ? 'card--deal' : ''}`}>
      <div className="card__media">
        <Link to={`/medicines/${m.id}`}><MedicineImage src={m.image_url} alt={m.name} /></Link>
        <div className="card__badges">
          {m.discount_percent > 0 && <span className="off">−{m.discount_percent}%</span>}
          <MedicineBadges medicine={m} />
        </div>
        <button className={`fav-btn fav-btn--float ${isFav ? 'is-on' : ''}`} onClick={() => fav.toggle(m)}
          aria-pressed={isFav} aria-label={isFav ? 'Убрать из избранного' : 'В избранное'}>
          <HeartIcon size={17} filled={isFav} />
        </button>
      </div>
      <Link to={`/medicines/${m.id}`} className="card__name">{m.name}</Link>
      <span className="card__meta">{[m.form, m.dosage, m.package].filter(Boolean).join(' · ')}</span>
      <StarRating value={m.rating} count={m.reviews_count} size={13} />
      <Price medicine={m} size="lg" />
      {variant === 'deal' && (
        <div className="meter meter--deal">
          <span>Осталось {m.stock} шт.</span>
          <i style={{ '--w': `${Math.max(8, Math.min(100, m.stock * 2))}%` }} />
        </div>
      )}
      <div className="card__cart"><CartButton medicine={m} block /></div>
    </article>
  )
}
