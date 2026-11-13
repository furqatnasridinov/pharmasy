import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { formatPrice, plural } from '../utils/format'

const FREE_DELIVERY_FROM = 200

/** Мини-корзина справа от каталога. */
export default function CartPanel() {
  const { items, count, total } = useCart()
  const { user } = useAuth()

  return (
    <aside className="cart-panel">
      <h2>Корзина <span>{items.length} {plural(items.length, ['позиция', 'позиции', 'позиций'])}</span></h2>
      {items.length === 0 ? (
        <p className="cart-panel__empty">Корзина пуста. Добавьте препараты из каталога — они появятся здесь.</p>
      ) : (
        <>
          <ul className="cart-panel__list">
            {items.map((i) => (
              <li key={i.id}>
                <span>{i.name}<small>{i.quantity} × {formatPrice(i.final_price)}</small></span>
                <b>{formatPrice(i.final_price * i.quantity)}</b>
              </li>
            ))}
          </ul>
          <div className="cart-panel__total"><span>Итого, {count} шт.</span><span>{formatPrice(total)}</span></div>
          <Link to={user ? '/checkout' : '/login'} state={user ? undefined : { from: '/checkout' }}
            className="btn btn--primary btn--block btn--lg">
            {user ? 'Оформить заказ' : 'Войти и оформить'}
          </Link>
          <Link to="/cart" className="btn btn--ghost btn--block">Открыть корзину</Link>
          <p className="note">
            {total < FREE_DELIVERY_FROM
              ? `До бесплатной доставки осталось ${formatPrice(FREE_DELIVERY_FROM - total)}.`
              : 'Доставка по Душанбе — бесплатно.'}
            {' '}Итоговую сумму проверяет сервер при оформлении.
          </p>
        </>
      )}
    </aside>
  )
}
