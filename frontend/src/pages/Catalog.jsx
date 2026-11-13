import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { categoriesApi, medicinesApi, ordersApi, promotionsApi } from '../api'
import { errorMessage } from '../api/client'
import CartPanel from '../components/CartPanel'
import { CloseIcon } from '../components/Icons'
import MedicineRow from '../components/MedicineRow'
import OrderTracker from '../components/OrderTracker'
import Pagination from '../components/Pagination'
import PromoBanners from '../components/PromoBanners'
import { EmptyState, ErrorState, Loader } from '../components/States'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { DELIVERY_LABEL, formatDate, formatPrice, greeting, plural } from '../utils/format'

const SORTS = [
  { value: 'price_asc', label: 'Цена ↑' },
  { value: 'price_desc', label: 'Цена ↓' },
  { value: 'name', label: 'Название' },
  { value: 'rating', label: 'Рейтинг' },
]
const PAGE_SIZE = 12
const ACTIVE = ['new', 'accepted', 'ready']

function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__sw" aria-hidden="true" />
    </label>
  )
}

/** Приветствие и последний активный заказ — только для вошедшего пользователя. */
function Greeting({ user, order }) {
  const firstName = user.full_name.split(' ')[0]
  return (
    <div className="hello">
      <div>
        <h2>{greeting()}, {firstName}</h2>
        {order ? (
          <>
            <p>Заказ №{order.id} от {formatDate(order.created_at)} · {DELIVERY_LABEL[order.delivery_method].toLowerCase()}
              {order.delivery_address ? ` на ${order.delivery_address}` : ''} · {formatPrice(order.total_price)}</p>
            <OrderTracker status={order.status} />
          </>
        ) : <p>Активных заказов нет. Найдите нужный препарат через поиск или по категориям.</p>}
      </div>
      {order && <Link to={`/orders/${order.id}`} className="btn btn--line">Открыть заказ</Link>}
    </div>
  )
}

export default function Catalog() {
  const { user } = useAuth()
  const cart = useCart()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [categories, setCategories] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [promos, setPromos] = useState([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filters = useMemo(() => ({
    search: params.get('search') || '',
    category_id: params.get('category_id') || '',
    min_price: params.get('min_price') || '',
    max_price: params.get('max_price') || '',
    in_stock: params.get('in_stock') === 'true',
    on_sale: params.get('on_sale') === 'true',
    otc_only: params.get('otc_only') === 'true',
    sort: params.get('sort') || 'name',
    page: Number(params.get('page') || 1),
  }), [params])

  const [priceDraft, setPriceDraft] = useState({ min: filters.min_price, max: filters.max_price })
  useEffect(() => { setPriceDraft({ min: filters.min_price, max: filters.max_price }) }, [filters.min_price, filters.max_price])

  /** Меняет query-параметры; любой фильтр, кроме страницы, сбрасывает на первую страницу. */
  const update = useCallback((changes) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => {
      if (v === '' || v === false || v === null || v === undefined) next.delete(k)
      else next.set(k, String(v))
    })
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }, [params, setParams])

  useEffect(() => { categoriesApi.list().then(setCategories).catch(() => {}) }, [])
  useEffect(() => { if (filters.on_sale) promotionsApi.active().then(setPromos).catch(() => {}) }, [filters.on_sale])
  useEffect(() => {
    if (!user) { setOrders([]); return }
    ordersApi.my().then(setOrders).catch(() => {})
  }, [user])

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    const query = { sort: filters.sort, page: filters.page, page_size: PAGE_SIZE }
    for (const key of ['search', 'category_id', 'min_price', 'max_price']) if (filters[key]) query[key] = filters[key]
    for (const key of ['in_stock', 'on_sale', 'otc_only']) if (filters[key]) query[key] = true
    medicinesApi.list(query)
      .then((data) => { setResult(data); cart.refresh(data.items) })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const activeOrder = orders.find((o) => ACTIVE.includes(o.status))
  const boughtBefore = useMemo(() => {
    const seen = new Map()
    orders.filter((o) => o.status === 'completed').forEach((o) => o.items.forEach((i) => {
      if (!seen.has(i.medicine_id)) seen.set(i.medicine_id, i)
    }))
    return [...seen.values()].slice(0, 4)
  }, [orders])

  const buyAgain = async (item) => {
    try {
      const med = await medicinesApi.get(item.medicine_id)
      if (!med.is_available) return toast.show(`«${med.name}» сейчас нет в наличии`, 'info')
      if (cart.add(med, 1)) toast.show(`«${med.name}» добавлен в корзину`)
      else toast.show(`В наличии только ${med.stock} шт.`, 'info')
    } catch (e) { toast.show(errorMessage(e), 'error') }
  }

  const applyPrice = () => update({ min_price: priceDraft.min, max_price: priceDraft.max })
  const category = categories.find((c) => String(c.id) === filters.category_id)
  const title = filters.search ? `Поиск: «${filters.search}»` : filters.on_sale ? 'Товары со скидкой' : category?.name || 'Все препараты'
  const totalAll = categories.reduce((s, c) => s + c.medicines_count, 0)

  const chips = [
    filters.search && { key: 'search', label: `«${filters.search}»` },
    filters.in_stock && { key: 'in_stock', label: 'Только в наличии' },
    filters.otc_only && { key: 'otc_only', label: 'Без рецепта' },
    filters.on_sale && { key: 'on_sale', label: 'Со скидкой' },
    (filters.min_price || filters.max_price) && {
      key: 'price', label: `${filters.min_price || 0}–${filters.max_price || '∞'} смн`,
    },
  ].filter(Boolean)

  const removeChip = (key) => (key === 'price' ? update({ min_price: '', max_price: '' }) : update({ [key]: '' }))

  return (
    <div className={`catalog ${user ? '' : 'catalog--guest'}`}>
      <aside className={`rail ${filtersOpen ? 'is-open' : ''}`}>
        <button className="rail__close" onClick={() => setFiltersOpen(false)} aria-label="Закрыть фильтры"><CloseIcon /></button>
        <h4>Категории</h4>
        <button className={`rail__cat ${!filters.category_id ? 'is-on' : ''}`} onClick={() => update({ category_id: '' })}>
          Все препараты <span>{totalAll}</span>
        </button>
        {categories.map((c) => (
          <button key={c.id} className={`rail__cat ${filters.category_id === String(c.id) ? 'is-on' : ''}`}
            onClick={() => update({ category_id: c.id })}>
            {c.name} <span>{c.medicines_count}</span>
          </button>
        ))}
        <div className="rail__sep" />
        <Toggle label="Только в наличии" checked={filters.in_stock} onChange={(v) => update({ in_stock: v })} />
        <Toggle label="Без рецепта" checked={filters.otc_only} onChange={(v) => update({ otc_only: v })} />
        <Toggle label="Со скидкой" checked={filters.on_sale} onChange={(v) => update({ on_sale: v })} />
        <div className="rail__sep" />
        <h4>Цена, смн</h4>
        <form className="rail__price" onSubmit={(e) => { e.preventDefault(); applyPrice() }}>
          <input type="number" min="0" inputMode="decimal" placeholder="от" value={priceDraft.min}
            onChange={(e) => setPriceDraft((p) => ({ ...p, min: e.target.value }))} onBlur={applyPrice} aria-label="Цена от" />
          <input type="number" min="0" inputMode="decimal" placeholder="до" value={priceDraft.max}
            onChange={(e) => setPriceDraft((p) => ({ ...p, max: e.target.value }))} onBlur={applyPrice} aria-label="Цена до" />
        </form>
        {user && boughtBefore.length > 0 && (
          <>
            <div className="rail__sep" />
            <h4>Вы уже покупали</h4>
            <div className="again">
              {boughtBefore.map((i) => (
                <div key={i.medicine_id}>
                  <span>{i.medicine_name}{i.dosage ? `, ${i.dosage}` : ''}</span>
                  <button onClick={() => buyAgain(i)}>+ Ещё раз</button>
                </div>
              ))}
            </div>
          </>
        )}
      </aside>

      <section className="catalog__main">
        {user && <Greeting user={user} order={activeOrder} />}
        {filters.on_sale && promos.length > 0 && <PromoBanners promotions={promos} />}

        <div className="catalog__head">
          <div>
            <h1>{title}</h1>
            {result && <p>{result.total} {plural(result.total, ['препарат', 'препарата', 'препаратов'])}</p>}
          </div>
          <div className="catalog__tools">
            <button className="btn btn--line catalog__filters-btn" onClick={() => setFiltersOpen(true)}>Фильтры</button>
            <div className="segmented" role="group" aria-label="Сортировка">
              {SORTS.map((s) => (
                <button key={s.value} className={filters.sort === s.value ? 'is-on' : ''} onClick={() => update({ sort: s.value })}>{s.label}</button>
              ))}
            </div>
          </div>
        </div>

        {chips.length > 0 && (
          <div className="chips">
            {chips.map((c) => (
              <button key={c.key} className="chip" onClick={() => removeChip(c.key)}>{c.label} <span aria-hidden="true">✕</span></button>
            ))}
            <button className="chip chip--clear" onClick={() => setParams(filters.category_id ? { category_id: filters.category_id } : {})}>Сбросить</button>
          </div>
        )}

        {loading && !result && <Loader />}
        {error && <ErrorState text={error} onRetry={load} />}
        {result && !error && (
          result.items.length === 0 ? (
            <EmptyState icon="🔍" title="Ничего не найдено"
              text="Попробуйте изменить запрос или сбросить фильтры." action="Сбросить фильтры" onAction={() => setParams({})} />
          ) : (
            <div className={`rows ${loading ? 'is-loading' : ''}`}>
              {result.items.map((m) => <MedicineRow key={m.id} medicine={m} />)}
              <div className="catalog__pager">
                <span>Показано {(result.page - 1) * result.page_size + 1}–{Math.min(result.page * result.page_size, result.total)} из {result.total}</span>
                <Pagination page={result.page} pages={result.pages} onChange={(p) => { update({ page: p }); window.scrollTo(0, 0) }} />
              </div>
            </div>
          )
        )}
      </section>

      <CartPanel />
    </div>
  )
}
