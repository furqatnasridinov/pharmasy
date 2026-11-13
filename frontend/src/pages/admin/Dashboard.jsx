import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../api'
import { errorMessage } from '../../api/client'
import { ErrorState, Loader } from '../../components/States'
import { formatPrice, formatShortDate } from '../../utils/format'
import { POLL_MS } from './AdminLayout'

function MedList({ items, empty, render }) {
  if (!items.length) return <p className="muted">{empty}</p>
  return <ul className="dash-list">{items.map((m) => <li key={m.id}>{render(m)}</li>)}</ul>
}

export default function Dashboard() {
  const [d, setD] = useState(null)
  const [error, setError] = useState('')

  const load = () => adminApi.dashboard().then(setD).catch((e) => setError(errorMessage(e)))
  useEffect(() => {
    load()
    const t = setInterval(load, POLL_MS)
    return () => clearInterval(t)
  }, [])

  if (error) return <ErrorState text={error} onRetry={load} />
  if (!d) return <Loader />

  const maxSold = Math.max(1, ...d.top_medicines.map((t) => t.sold))

  return (
    <div className="admin-page">
      <div className="admin-page__head"><h1>Дашборд</h1></div>

      <div className="kpis">
        <Link to="/admin/orders?status=new" className={`kpi ${d.new_orders ? 'kpi--accent' : ''}`}>
          <span>Новые заказы</span><b>{d.new_orders}</b><small>ждут обработки</small>
        </Link>
        <div className="kpi"><span>Выручка за 30 дней</span><b>{formatPrice(d.revenue_30d)}</b><small>всего {formatPrice(d.revenue_total)}</small></div>
        <div className="kpi"><span>Всего заказов</span><b>{d.total_orders}</b><small>за всё время</small></div>
        <div className="kpi"><span>Лекарств</span><b>{d.medicines_total}</b><small>в каталоге</small></div>
        <div className="kpi"><span>Пользователей</span><b>{d.users_total}</b><small>зарегистрировано</small></div>
      </div>

      <div className="dash-grid">
        <section className="panel">
          <h2>Топ-5 продаж</h2>
          {d.top_medicines.length === 0 ? <p className="muted">Пока нет выполненных заказов.</p> : (
            <ol className="top-list">
              {d.top_medicines.map((t) => (
                <li key={t.id}>
                  <div><b>{t.name}</b>{t.dosage && <small> {t.dosage}</small>}</div>
                  <div className="top-list__bar"><i style={{ width: `${(t.sold / maxSold) * 100}%` }} /></div>
                  <span>{t.sold} шт. · {formatPrice(t.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="panel">
          <h2>Заканчиваются <small>остаток &lt; {d.low_stock_threshold}</small></h2>
          <MedList items={d.low_stock} empty="Все препараты в достаточном количестве."
            render={(m) => (<><Link to={`/admin/medicines?search=${encodeURIComponent(m.name)}`}>{m.name}</Link>
              <span className={`badge ${m.stock === 0 ? 'badge--red' : 'badge--amber'}`}>{m.stock === 0 ? 'Нет' : `${m.stock} шт.`}</span></>)} />
        </section>

        <section className="panel">
          <h2>Срок годности <small>порог {d.expiry_warning_days} дней</small></h2>
          <MedList items={[...d.expired, ...d.expiring]} empty="Нет препаратов с истекающим сроком."
            render={(m) => (<><Link to={`/admin/medicines?search=${encodeURIComponent(m.name)}`}>{m.name}</Link>
              <span>{formatShortDate(m.expiry_date)}</span>
              <span className={`badge ${m.expiry_status === 'expired' ? 'badge--red' : 'badge--amber'}`}>
                {m.expiry_status === 'expired' ? 'Просрочено' : 'Истекает'}
              </span></>)} />
        </section>
      </div>
    </div>
  )
}
