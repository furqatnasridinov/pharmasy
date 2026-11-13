import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { categoriesApi, medicinesApi, promotionsApi } from '../api'
import { errorMessage } from '../api/client'
import { CloseIcon } from '../components/Icons'
import MedicineRow from '../components/MedicineRow'
import Pagination from '../components/Pagination'
import PromoBanners from '../components/PromoBanners'
import { EmptyState, ErrorState, Loader } from '../components/States'
import { useCart } from '../context/CartContext'
import { plural } from '../utils/format'

const SORTS = [
  { value: 'rating', label: 'Сначала популярные' },
  { value: 'newest', label: 'Сначала новые' },
  { value: 'price_asc', label: 'Сначала дешевле' },
  { value: 'price_desc', label: 'Сначала дороже' },
  { value: 'name', label: 'По названию' },
  { value: 'discount', label: 'По размеру скидки' },
]
const PAGE_SIZE = 10
const MAKERS_COLLAPSED = 8

function CheckList({ title, items, selected, onToggle, collapsed }) {
  const [expanded, setExpanded] = useState(false)
  if (!items.length) return null
  const visible = collapsed && !expanded ? items.slice(0, collapsed) : items
  return (
    <section className="filter">
      <h4>{title}</h4>
      {visible.map((it) => (
        <label key={it.name} className="filter__check">
          <input type="checkbox" checked={selected.includes(it.name)} onChange={() => onToggle(it.name)} />
          <span>{it.name}</span><small>{it.count}</small>
        </label>
      ))}
      {collapsed && items.length > collapsed && (
        <button className="link" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Свернуть' : `Показать все (${items.length})`}
        </button>
      )}
    </section>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__sw" aria-hidden="true" />
    </label>
  )
}

export default function Catalog() {
  const cart = useCart()
  const [params, setParams] = useSearchParams()
  const [categories, setCategories] = useState([])
  const [facets, setFacets] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [promos, setPromos] = useState([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  const f = useMemo(() => ({
    search: params.get('search') || '',
    category_id: params.get('category_id') || '',
    min_price: params.get('min_price') || '',
    max_price: params.get('max_price') || '',
    in_stock: params.get('in_stock') === 'true',
    on_sale: params.get('on_sale') === 'true',
    otc_only: params.get('otc_only') === 'true',
    manufacturer: params.getAll('manufacturer'),
    form: params.getAll('form'),
    substance: params.get('substance') || '',
    sort: params.get('sort') || 'rating',
    page: Number(params.get('page') || 1),
  }), [params])

  const [priceDraft, setPriceDraft] = useState({ min: f.min_price, max: f.max_price })
  useEffect(() => { setPriceDraft({ min: f.min_price, max: f.max_price }) }, [f.min_price, f.max_price])

  /** Меняет query-параметры; массивы пишутся повторяющимися ключами. Любой фильтр сбрасывает страницу. */
  const update = useCallback((changes) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => {
      next.delete(k)
      if (Array.isArray(v)) v.forEach((x) => next.append(k, x))
      else if (v !== '' && v !== false && v !== null && v !== undefined) next.set(k, String(v))
    })
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }, [params, setParams])

  const toggleIn = (key, value) => {
    const list = f[key]
    update({ [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] })
  }

  useEffect(() => { categoriesApi.list().then(setCategories).catch(() => {}) }, [])
  useEffect(() => {
    if (f.on_sale) promotionsApi.active().then(setPromos).catch(() => {})
  }, [f.on_sale])
  useEffect(() => {
    const q = {}
    if (f.category_id) q.category_id = f.category_id
    if (f.search) q.search = f.search
    medicinesApi.facets(q).then(setFacets).catch(() => {})
  }, [f.category_id, f.search])

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    const q = { sort: f.sort, page: f.page, page_size: PAGE_SIZE }
    for (const k of ['search', 'category_id', 'min_price', 'max_price', 'substance']) if (f[k]) q[k] = f[k]
    for (const k of ['in_stock', 'on_sale', 'otc_only']) if (f[k]) q[k] = true
    if (f.manufacturer.length) q.manufacturer = f.manufacturer
    if (f.form.length) q.form = f.form
    medicinesApi.list(q)
      .then((data) => { setResult(data); cart.refresh(data.items) })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [f]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [load])

  const category = categories.find((c) => String(c.id) === f.category_id)
  const title = f.substance ? `Аналоги: ${f.substance}`
    : f.search ? `Результаты поиска «${f.search}»`
      : f.on_sale ? 'Акции и скидки'
        : category?.name || 'Все препараты'
  const hasFilters = Boolean(f.in_stock || f.otc_only || f.on_sale || f.min_price || f.max_price || f.manufacturer.length || f.form.length)
  const applyPrice = () => update({ min_price: priceDraft.min, max_price: priceDraft.max })
  const resetFilters = () => setParams(f.category_id ? { category_id: f.category_id } : {})

  return (
    <div className="container catalog-page">
      <nav className="crumbs" aria-label="Хлебные крошки">
        <Link to="/">Главная</Link><span>›</span>
        <Link to="/catalog">Каталог</Link>
        {category && <><span>›</span><span>{category.name}</span></>}
        {f.on_sale && <><span>›</span><span>Акции</span></>}
      </nav>

      <div className="catalog-layout">
        <aside className={`filters ${filtersOpen ? 'is-open' : ''}`}>
          <div className="filters__head">
            <h3>Фильтры</h3>
            <button className="icon-btn filters__close" onClick={() => setFiltersOpen(false)} aria-label="Закрыть"><CloseIcon /></button>
          </div>

          <section className="filter">
            <h4>Категории</h4>
            <button className={`filter__cat ${!f.category_id ? 'is-on' : ''}`} onClick={() => update({ category_id: '', manufacturer: [], form: [] })}>
              Все препараты
            </button>
            {categories.map((c) => (
              <button key={c.id} className={`filter__cat ${f.category_id === String(c.id) ? 'is-on' : ''}`}
                onClick={() => update({ category_id: c.id, manufacturer: [], form: [] })}>
                {c.name} <small>{c.medicines_count}</small>
              </button>
            ))}
          </section>

          <section className="filter">
            <h4>Наличие</h4>
            <Toggle label="Только в наличии" checked={f.in_stock} onChange={(v) => update({ in_stock: v })} />
            <Toggle label="Без рецепта" checked={f.otc_only} onChange={(v) => update({ otc_only: v })} />
            <Toggle label="Со скидкой" checked={f.on_sale} onChange={(v) => update({ on_sale: v })} />
          </section>

          <section className="filter">
            <h4>Цена, смн</h4>
            <form className="filter__price" onSubmit={(e) => { e.preventDefault(); applyPrice() }}>
              <input type="number" min="0" placeholder={facets ? `от ${Math.floor(facets.price_min)}` : 'от'}
                value={priceDraft.min} onChange={(e) => setPriceDraft((p) => ({ ...p, min: e.target.value }))} onBlur={applyPrice} aria-label="Цена от" />
              <input type="number" min="0" placeholder={facets ? `до ${Math.ceil(facets.price_max)}` : 'до'}
                value={priceDraft.max} onChange={(e) => setPriceDraft((p) => ({ ...p, max: e.target.value }))} onBlur={applyPrice} aria-label="Цена до" />
            </form>
          </section>

          {facets && (
            <>
              <CheckList title="Производители" items={facets.manufacturers} selected={f.manufacturer}
                onToggle={(v) => toggleIn('manufacturer', v)} collapsed={MAKERS_COLLAPSED} />
              <CheckList title="Форма выпуска" items={facets.forms} selected={f.form} onToggle={(v) => toggleIn('form', v)} />
            </>
          )}

          {hasFilters && <button className="btn btn--line btn--block" onClick={resetFilters}>Сбросить фильтры</button>}
          <button className="btn btn--primary btn--block filters__apply" onClick={() => setFiltersOpen(false)}>
            Показать {result ? result.total : ''}
          </button>
        </aside>

        <section className="catalog-main">
          {f.on_sale && promos.length > 0 && <PromoBanners promotions={promos} />}

          <div className="catalog-main__head">
            <div>
              <h1>{title}</h1>
              {result && <p className="muted">{result.total} {plural(result.total, ['товар', 'товара', 'товаров'])}</p>}
            </div>
            <div className="catalog-main__tools">
              <button className="btn btn--line filters-btn" onClick={() => setFiltersOpen(true)}>Фильтры</button>
              <select value={f.sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Сортировка" className="sort-select">
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {f.substance && (
            <div className="chips">
              <button className="chip" onClick={() => update({ substance: '' })}>Действующее вещество: {f.substance} <span aria-hidden="true">✕</span></button>
            </div>
          )}

          {loading && !result && <Loader />}
          {error && <ErrorState text={error} onRetry={load} />}
          {result && !error && (result.items.length === 0 ? (
            <EmptyState icon="🔍" title="Ничего не найдено" text="Попробуйте изменить запрос или сбросить фильтры."
              action="Сбросить фильтры" onAction={() => setParams({})} />
          ) : (
            <div className={`products ${loading ? 'is-loading' : ''}`}>
              {result.items.map((m) => <MedicineRow key={m.id} medicine={m} />)}
              <div className="catalog__pager">
                <span>Показано {(result.page - 1) * result.page_size + 1}–{Math.min(result.page * result.page_size, result.total)} из {result.total}</span>
                <Pagination page={result.page} pages={result.pages} onChange={(p) => { update({ page: p }); window.scrollTo(0, 0) }} />
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
