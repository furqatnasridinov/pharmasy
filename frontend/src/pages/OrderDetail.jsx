import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ordersApi } from '../api'
import { errorMessage } from '../api/client'
import { StatusBadge } from '../components/Badges'
import { ArrowLeftIcon } from '../components/Icons'
import MedicineImage from '../components/MedicineImage'
import OrderTracker from '../components/OrderTracker'
import { ErrorState, Loader } from '../components/States'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { DELIVERY_LABEL, formatDate, formatPrice } from '../utils/format'

export default function OrderDetail() {
  const { id } = useParams()
  const toast = useToast()
  const confirm = useConfirm()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    ordersApi.get(id).then(setOrder).catch((e) => setError(errorMessage(e)))
  }, [id])
  useEffect(() => { load() }, [load])

  if (error) return <div className="container page"><ErrorState text={error} onRetry={load} /></div>
  if (!order) return <Loader />

  const cancel = async () => {
    const ok = await confirm({ title: `Отменить заказ №${order.id}?`, message: 'Отменённый заказ нельзя восстановить.', confirmText: 'Отменить заказ' })
    if (!ok) return
    try {
      setOrder(await ordersApi.cancel(order.id))
      toast.show('Заказ отменён')
    } catch (e) { toast.show(errorMessage(e), 'error') }
  }

  return (
    <div className="container page order-detail">
      <Link to="/orders" className="back-link"><ArrowLeftIcon size={18} /> Мои заказы</Link>
      <div className="page__head">
        <h1>Заказ №{order.id}</h1>
        <StatusBadge status={order.status} />
      </div>
      <div className="panel"><OrderTracker status={order.status} /></div>

      <div className="order-detail__grid">
        <div className="panel">
          <h2>Состав заказа</h2>
          <ul className="order-items">
            {order.items.map((i) => (
              <li key={i.id}>
                <MedicineImage src={i.medicine_image} alt={i.medicine_name} className="order-items__img" />
                <div><Link to={`/medicines/${i.medicine_id}`}>{i.medicine_name}</Link><small>{[i.form, i.dosage].filter(Boolean).join(' · ')}</small></div>
                <span>{i.quantity} × {formatPrice(i.price_at_purchase)}</span>
                <b>{formatPrice(i.subtotal)}</b>
              </li>
            ))}
          </ul>
          <div className="summary__total"><span>Итого</span><span>{formatPrice(order.total_price)}</span></div>
        </div>
        <div className="panel">
          <h2>Получение</h2>
          <dl className="specs specs--stack">
            <div><dt>Дата заказа</dt><dd>{formatDate(order.created_at, true)}</dd></div>
            <div><dt>Способ</dt><dd>{DELIVERY_LABEL[order.delivery_method]}</dd></div>
            <div><dt>{order.delivery_method === 'delivery' ? 'Адрес' : 'Аптека'}</dt>
              <dd>{order.delivery_address || 'Душанбе, пр. Рудаки, 12'}</dd></div>
            {order.comment && <div><dt>Комментарий</dt><dd>{order.comment}</dd></div>}
          </dl>
          {order.allowed_transitions.includes('cancelled') && (
            <button className="btn btn--danger-line btn--block" onClick={cancel}>Отменить заказ</button>
          )}
          {order.status === 'new' && <p className="note">Заказ можно отменить, пока аптека его не приняла.</p>}
        </div>
      </div>
    </div>
  )
}
