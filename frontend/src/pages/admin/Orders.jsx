import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminApi } from '../../api'
import { errorMessage } from '../../api/client'
import { StatusBadge } from '../../components/Badges'
import { CloseIcon } from '../../components/Icons'
import { EmptyState, Loader } from '../../components/States'
import { useConfirm } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
import { DELIVERY_LABEL, formatDate, formatPrice, ORDER_STATUS, STATUS_ACTIONS } from '../../utils/format'
import { POLL_MS, useAdmin } from './AdminLayout'

const FILTERS = ['', 'new', 'accepted', 'ready', 'completed', 'cancelled']

function OrderPanel({ order, onClose, onChanged }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [busy, setBusy] = useState(false)
  const [edit, setEdit] = useState(null)
  const editable = !['completed', 'cancelled'].includes(order.status)

  const saveEdit = async (e) => {
    e.preventDefault()
    try {
      const updated = await adminApi.editOrder(order.id, edit)
      toast.show(`Заказ №${order.id} изменён`)
      setEdit(null)
      onChanged(updated)
    } catch (err) { toast.show(errorMessage(err), 'error') }
  }

  const change = async (status) => {
    if (status === 'cancelled') {
      const ok = await confirm({
        title: `Отменить заказ №${order.id}?`,
        message: ['accepted', 'ready'].includes(order.status) ? 'Товар вернётся на склад.' : 'Склад не изменится.',
        confirmText: 'Отменить заказ',
      })
      if (!ok) return
    }
    setBusy(true)
    try {
      const updated = await adminApi.setOrderStatus(order.id, status)
      toast.show(`Заказ №${order.id}: ${ORDER_STATUS[status].label.toLowerCase()}`)
      onChanged(updated)
    } catch (e) {
      toast.show(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="order-panel">
      <div className="order-panel__head">
        <h2>Заказ №{order.id}</h2>
        <StatusBadge status={order.status} />
        <button className="icon-btn" onClick={onClose} aria-label="Закрыть"><CloseIcon size={18} /></button>
      </div>
      <p className="muted">{formatDate(order.created_at, true)}</p>

      {edit ? (
        <form className="order-edit" onSubmit={saveEdit}>
          <h3>Получение</h3>
          <label className="field"><span>Способ</span>
            <select value={edit.delivery_method} onChange={(e) => setEdit({ ...edit, delivery_method: e.target.value })}>
              <option value="pickup">Самовывоз</option><option value="delivery">Доставка</option>
            </select>
          </label>
          {edit.delivery_method === 'delivery' && (
            <label className="field"><span>Адрес *</span>
              <input required value={edit.delivery_address} onChange={(e) => setEdit({ ...edit, delivery_address: e.target.value })} />
            </label>
          )}
          <label className="field"><span>Комментарий</span>
            <textarea rows={2} value={edit.comment} onChange={(e) => setEdit({ ...edit, comment: e.target.value })} />
          </label>
          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setEdit(null)}>Отмена</button>
            <button className="btn btn--primary">Сохранить</button>
          </div>
        </form>
      ) : editable && (
        <button className="link" onClick={() => setEdit({ delivery_method: order.delivery_method, delivery_address: order.delivery_address || '', comment: order.comment || '' })}>
          Изменить получение и комментарий
        </button>
      )}

      <h3>Покупатель</h3>
      <dl className="specs specs--stack">
        <div><dt>ФИО</dt><dd>{order.customer.full_name}</dd></div>
        <div><dt>Телефон</dt><dd>{order.customer.phone || '—'}</dd></div>
        <div><dt>Email</dt><dd>{order.customer.email}</dd></div>
        <div><dt>Получение</dt><dd>{DELIVERY_LABEL[order.delivery_method]}</dd></div>
        {order.delivery_address && <div><dt>Адрес</dt><dd>{order.delivery_address}</dd></div>}
        {order.comment && <div><dt>Комментарий</dt><dd>{order.comment}</dd></div>}
      </dl>

      <h3>Состав</h3>
      <ul className="summary__items">
        {order.items.map((i) => (
          <li key={i.id}><span>{i.medicine_name}{i.dosage ? `, ${i.dosage}` : ''} × {i.quantity}</span><span>{formatPrice(i.subtotal)}</span></li>
        ))}
      </ul>
      <div className="summary__total"><span>Итого</span><span>{formatPrice(order.total_price)}</span></div>

      {order.allowed_transitions.length > 0 && (
        <div className="order-panel__actions">
          {order.allowed_transitions.map((s) => (
            <button key={s} disabled={busy} onClick={() => change(s)}
              className={`btn ${s === 'cancelled' ? 'btn--danger-line' : 'btn--primary'}`}>{STATUS_ACTIONS[s]}</button>
          ))}
        </div>
      )}
      {order.status === 'new' && <p className="note">При принятии заказа остатки списываются со склада.</p>}
    </aside>
  )
}

export default function Orders() {
  const toast = useToast()
  const { refreshCounts } = useAdmin()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''
  const [orders, setOrders] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [counts, setCounts] = useState({})
  const [updatedAt, setUpdatedAt] = useState(null)
  const firstLoad = useRef(true)

  const load = useCallback(() => {
    Promise.all([adminApi.orders(status), adminApi.orderCounts()])
      .then(([list, c]) => { setOrders(list); setCounts(c); setUpdatedAt(new Date()) })
      .catch((e) => { if (firstLoad.current) toast.show(errorMessage(e), 'error') })
      .finally(() => { firstLoad.current = false })
  }, [status, toast])

  // Автообновление каждые 10 секунд
  useEffect(() => {
    load()
    const t = setInterval(load, POLL_MS)
    return () => clearInterval(t)
  }, [load])

  const selected = orders?.find((o) => o.id === selectedId)
  const onChanged = (updated) => {
    setOrders((list) => list.map((o) => (o.id === updated.id ? updated : o)))
    refreshCounts()
    load()
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <h1>Заказы</h1>
        {updatedAt && <span className="muted small">Обновляется каждые 10 сек · {updatedAt.toLocaleTimeString('ru-RU')}</span>}
      </div>

      <div className="tabs" role="tablist">
        {FILTERS.map((f) => (
          <button key={f || 'all'} role="tab" aria-selected={status === f} className={status === f ? 'is-on' : ''}
            onClick={() => setParams(f ? { status: f } : {})}>
            {f ? ORDER_STATUS[f].label : 'Все'} <span>{f ? counts[f] || 0 : total}</span>
          </button>
        ))}
      </div>

      <div className={`orders-layout ${selected ? 'has-panel' : ''}`}>
        {!orders ? <Loader /> : orders.length === 0 ? <EmptyState icon="📦" title="Заказов нет" text="Здесь появятся заказы с выбранным статусом." /> : (
          <div className="table-wrap">
            <table className="table table--click">
              <thead><tr><th>№</th><th>Дата</th><th>Покупатель</th><th>Получение</th><th className="num">Сумма</th><th>Статус</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} onClick={() => setSelectedId(o.id)}
                    className={`${o.status === 'new' ? 'is-new' : ''} ${o.id === selectedId ? 'is-selected' : ''}`}>
                    <td><b>{o.id}</b></td>
                    <td className="nowrap">{formatDate(o.created_at, true)}</td>
                    <td>{o.customer.full_name}<div className="muted small">{o.customer.phone}</div></td>
                    <td>{DELIVERY_LABEL[o.delivery_method]}</td>
                    <td className="num">{formatPrice(o.total_price)}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {selected && <OrderPanel key={selected.id} order={selected} onClose={() => setSelectedId(null)} onChanged={onChanged} />}
      </div>
    </div>
  )
}
