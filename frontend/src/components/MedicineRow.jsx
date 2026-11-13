import { Link } from 'react-router-dom'
import { useFavorites } from '../context/FavoritesContext'
import { plural } from '../utils/format'
import { MedicineBadges } from './Badges'
import CartButton from './CartButton'
import { HeartIcon } from './Icons'
import MedicineImage from './MedicineImage'
import Price from './Price'
import StarRating from './StarRating'

/** «Нурофен 200 мг №20» — как в аптечных каталогах; № только для штучных упаковок. */
export function fullName(m) {
  const count = /^(\d+)\s+(табл|капс|драже|пакет|свеч|ампул|флакон|доз)/.exec(m.package || '')
  return [m.name, m.dosage, count ? `№${count[1]}` : m.package].filter(Boolean).join(' ')
}

function StockLine({ medicine: m }) {
  if (m.expiry_status === 'expired') return <span className="stock-line stock-line--off">Недоступно: истёк срок годности</span>
  if (m.stock === 0) return <span className="stock-line stock-line--off">Нет в наличии</span>
  if (m.stock < 5) return <span className="stock-line stock-line--low">Осталось {m.stock} шт.</span>
  return <span className="stock-line">В наличии</span>
}

/** Горизонтальная карточка товара в каталоге: фото — описание — цена и кнопка. */
export default function MedicineRow({ medicine: m }) {
  const fav = useFavorites()
  const isFav = fav.isFavorite(m.id)
  const props = [
    ['Производитель', m.manufacturer],
    ['Страна', m.country],
    ['Форма выпуска', [m.form, m.dosage, m.package].filter(Boolean).join(', ')],
    ['Действующее вещество', m.active_substance],
  ].filter(([, v]) => v)

  return (
    <article className={`product ${m.is_available ? '' : 'product--dim'}`}>
      <div className="product__media">
        <Link to={`/medicines/${m.id}`}><MedicineImage src={m.image_url} alt={m.name} /></Link>
        {m.discount_percent > 0 && <span className="off product__off">−{m.discount_percent}%</span>}
        <button className={`fav-btn fav-btn--float ${isFav ? 'is-on' : ''}`} onClick={() => fav.toggle(m)}
          aria-pressed={isFav} aria-label={isFav ? 'Убрать из избранного' : 'В избранное'}>
          <HeartIcon size={17} filled={isFav} />
        </button>
      </div>

      <div className="product__info">
        <Link to={`/medicines/${m.id}`} className="product__name">{fullName(m)}</Link>
        <div className="product__rating">
          <StarRating value={m.rating} size={14} />
          <span className="muted small">{m.reviews_count ? `${m.reviews_count} ${plural(m.reviews_count, ['отзыв', 'отзыва', 'отзывов'])}` : 'нет отзывов'}</span>
        </div>
        <dl className="product__props">
          {props.map(([k, v]) => <div key={k}><dt>{k}:</dt><dd>{v}</dd></div>)}
        </dl>
        <div className="product__badges"><MedicineBadges medicine={m} showStock={false} /></div>
      </div>

      <div className="product__buy">
        <span className="product__price-label">Цена</span>
        <Price medicine={m} size="lg" muted={!m.is_available} />
        <StockLine medicine={m} />
        <CartButton medicine={m} block />
        {m.active_substance && (
          <Link className="product__analogs" to={`/catalog?substance=${encodeURIComponent(m.active_substance)}`}>Показать аналоги ›</Link>
        )}
      </div>
    </article>
  )
}
