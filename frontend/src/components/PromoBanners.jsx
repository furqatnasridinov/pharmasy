import { Link } from 'react-router-dom'
import { formatDate } from '../utils/format'
import { TruckIcon } from './Icons'

function period(p) {
  if (!p.ends_at) return 'Постоянно'
  const start = formatDate(p.starts_at).replace(/ \d{4} г\.$/, '')
  const end = formatDate(p.ends_at).replace(/ \d{4} г\.$/, '')
  return `${start} – ${end}`
}

export default function PromoBanners({ promotions }) {
  if (!promotions?.length) return null
  return (
    <div className="promos">
      {promotions.slice(0, 3).map((p, i) => (
        <div key={p.id} className={`promo promo--${p.theme} ${i === 0 ? 'promo--wide' : ''}`}>
          {p.discount_percent ? <span className="promo__big">−{p.discount_percent}%</span> : null}
          {p.theme === 'blue' && <TruckIcon className="promo__art" size={72} strokeWidth={1.5} />}
          <h3>{p.title}</h3>
          {p.description && <p>{p.description}</p>}
          <div className="promo__foot">
            <span>{period(p)}</span>
            <Link className="promo__btn" to={p.category_id ? `/catalog?category_id=${p.category_id}` : '/catalog'}>
              {p.category_id ? 'Выбрать' : 'В каталог'}
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
