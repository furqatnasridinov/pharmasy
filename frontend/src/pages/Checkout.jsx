import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ordersApi } from '../api'
import { errorMessage } from '../api/client'
import { HomeIcon, TruckIcon } from '../components/Icons'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { formatPrice } from '../utils/format'

export default function Checkout() {
  const { items, total, clear } = useCart()
  const toast = useToast()
  const navigate = useNavigate()
  const [method, setMethod] = useState('pickup')
  const [address, setAddress] = useState('')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Подставляем адрес из прошлого заказа с доставкой
  useEffect(() => {
    ordersApi.my().then((orders) => {
      const last = orders.find((o) => o.delivery_address)
      if (last) setAddress((a) => a || last.delivery_address)
    }).catch(() => {})
  }, [])

  if (items.length === 0 && !busy) return <Navigate to="/cart" replace />

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (method === 'delivery' && !address.trim()) { setError('Укажите адрес доставки'); return }
    setBusy(true)
    try {
      const order = await ordersApi.create({
        items: items.map((i) => ({ medicine_id: i.id, quantity: i.quantity })),
        delivery_method: method,
        delivery_address: method === 'delivery' ? address.trim() : null,
        comment: comment.trim() || null,
      })
      clear()
      toast.show(`Заказ №${order.id} оформлен`)
      navigate(`/orders/${order.id}`, { replace: true })
    } catch (err) {
      const msg = errorMessage(err)
      setError(msg)
      toast.show(msg, 'error')
      setBusy(false)
    }
  }

  return (
    <div className="container page">
      <div className="page__head"><h1>Оформление заказа</h1><Link to="/cart" className="link">Вернуться в корзину</Link></div>
      <form className="checkout" onSubmit={submit}>
        <div className="checkout__main">
          <fieldset className="field-group">
            <legend>Способ получения</legend>
            <div className="choice">
              <label className={`choice__opt ${method === 'pickup' ? 'is-on' : ''}`}>
                <input type="radio" name="method" value="pickup" checked={method === 'pickup'} onChange={() => setMethod('pickup')} />
                <HomeIcon /><span><b>Самовывоз</b><small>Худжанд, ул. Камоли Худжанди, 12 · бесплатно</small></span>
              </label>
              <label className={`choice__opt ${method === 'delivery' ? 'is-on' : ''}`}>
                <input type="radio" name="method" value="delivery" checked={method === 'delivery'} onChange={() => setMethod('delivery')} />
                <TruckIcon /><span><b>Доставка</b><small>Курьером по Худжанду за 2 часа</small></span>
              </label>
            </div>
          </fieldset>

          {method === 'delivery' && (
            <label className="field">
              <span>Адрес доставки *</span>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Например: Худжанд, ул. Ленина, 5, кв. 12" required />
            </label>
          )}
          <label className="field">
            <span>Комментарий к заказу</span>
            <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000}
              placeholder={method === 'delivery' ? 'Например: позвоните за 10 минут' : 'Необязательно'} />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>

        <aside className="summary">
          <h2>Ваш заказ</h2>
          <ul className="summary__items">
            {items.map((i) => (
              <li key={i.id}><span>{i.name} × {i.quantity}</span><span>{formatPrice(i.final_price * i.quantity)}</span></li>
            ))}
          </ul>
          <div className="summary__total"><span>Итого</span><span>{formatPrice(total)}</span></div>
          <button className="btn btn--primary btn--block btn--lg" disabled={busy}>{busy ? 'Оформляем…' : 'Подтвердить заказ'}</button>
          <p className="note">Итоговая сумма пересчитывается на сервере по актуальным ценам. Оплата при получении.</p>
        </aside>
      </form>
    </div>
  )
}
