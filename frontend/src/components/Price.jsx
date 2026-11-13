import { formatPrice } from '../utils/format'

/** Цена: при скидке — новая красным и старая зачёркнутой. */
export default function Price({ medicine, size = 'md', muted = false }) {
  const m = medicine
  const sale = m.discount_percent > 0
  return (
    <span className={`price price--${size} ${muted ? 'price--muted' : ''}`}>
      <span className={sale ? 'price__now price__now--sale' : 'price__now'}>{formatPrice(m.final_price)}</span>
      {sale && <s className="price__old">{formatPrice(m.price)}</s>}
    </span>
  )
}
