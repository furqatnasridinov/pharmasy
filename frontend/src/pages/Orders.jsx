import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ordersApi } from '../api'
import { errorMessage } from '../api/client'
import { StatusBadge } from '../components/Badges'
import { EmptyState, ErrorState, Loader } from '../components/States'
import { DELIVERY_LABEL, formatDate, formatPrice, plural } from '../utils/format'

export default function Orders() {
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')

  const load = () => ordersApi.my().then(setOrders).catch((e) => setError(errorMessage(e)))
  useEffect(() => { load() }, [])

  if (error) return <div className="container page"><ErrorState text={error} onRetry={load} /></div>
  if (!orders) return <Loader />

  return (
    <div className="container page">
      <div className="page__head"><h1>Мои заказы</h1></div>
      {orders.length === 0 ? (
        <EmptyState icon="📦" title="Заказов пока нет" text="Оформите первый заказ — он появится здесь вместе со статусом." action="Перейти в каталог" to="/catalog" />
      ) : (
        <ul className="order-list">
          {orders.map((o) => (
            <li key={o.id}>
              <Link to={`/orders/${o.id}`} className="order-card">
                <div className="order-card__head">
                  <b>Заказ №{o.id}</b>
                  <StatusBadge status={o.status} />
                </div>
                <div className="order-card__meta">
                  {formatDate(o.created_at, true)} · {DELIVERY_LABEL[o.delivery_method]}
                  {o.delivery_address ? ` · ${o.delivery_address}` : ''}
                </div>
                <div className="order-card__items">
                  {o.items.map((i) => `${i.medicine_name} × ${i.quantity}`).join(', ')}
                </div>
                <div className="order-card__foot">
                  <span>{o.items_count} {plural(o.items_count, ['товар', 'товара', 'товаров'])}</span>
                  <b>{formatPrice(o.total_price)}</b>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
