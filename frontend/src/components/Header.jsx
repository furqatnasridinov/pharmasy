import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { categoriesApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'
import { plural } from '../utils/format'
import { BoxIcon, CartIcon, ChartIcon, GridIcon, HeartIcon, LogoutIcon, SearchIcon, TagIcon, UserIcon } from './Icons'
import Logo from './Logo'
import ThemeSwitch from './ThemeSwitch'

function IconLink({ to, icon: Icon, label, count, onClick, secondary }) {
  const content = (
    <>
      <span className="icon-link__icon"><Icon size={22} />{count > 0 && <span className="icon-link__count">{count}</span>}</span>
      <span className="icon-link__label">{label}</span>
    </>
  )
  const cls = `icon-link ${secondary ? 'icon-link--secondary' : ''}`
  if (onClick) return <button className={cls} onClick={onClick} aria-label={label}>{content}</button>
  return <NavLink to={to} className={cls} aria-label={label}>{content}</NavLink>
}

export default function Header() {
  const { user, isAdmin, logout } = useAuth()
  const { count } = useCart()
  const favorites = useFavorites()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('search') || '')
  const [categories, setCategories] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => { categoriesApi.list().then(setCategories).catch(() => {}) }, [])

  useEffect(() => {
    setMenuOpen(false)
    if (location.pathname === '/catalog') setQuery(params.get('search') || '')
  }, [location.pathname, location.search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Закрываем меню каталога по клику вне его
  useEffect(() => {
    if (!menuOpen) return undefined
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const total = categories.reduce((s, c) => s + c.medicines_count, 0)
  const activeCategory = location.pathname === '/catalog' ? params.get('category_id') : null
  const onSale = location.pathname === '/catalog' && params.get('on_sale') === 'true'

  const submit = (e) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/catalog?search=${encodeURIComponent(q)}` : '/catalog')
  }

  return (
    <header className="header">
      <div className="topbar">
        <div className="container topbar__inner">
          <span className="topbar__city">📍 город Худжанд</span>
          <nav>
            {!user && <Link to="/#how">Как сделать заказ</Link>}
            {!user && <Link to="/#delivery">Доставка и оплата</Link>}
            <a href="tel:+992000000000">+992 00 000-00-00</a>
            <ThemeSwitch />
          </nav>
        </div>
      </div>

      <div className="container header__main">
        <Logo />
        <div className="catmenu" ref={menuRef}>
          <button className="btn btn--primary catmenu__btn" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen}>
            <GridIcon size={18} /> <span>Каталог товаров</span>
          </button>
          {menuOpen && (
            <div className="catmenu__panel">
              <Link to="/catalog" className="catmenu__item catmenu__item--all">
                Все препараты <span>{total}</span>
              </Link>
              {categories.map((c) => (
                <Link key={c.id} to={`/catalog?category_id=${c.id}`} className="catmenu__item">
                  {c.name} <span>{c.medicines_count}</span>
                </Link>
              ))}
              <Link to="/catalog?on_sale=true" className="catmenu__item catmenu__item--sale">Товары со скидкой</Link>
            </div>
          )}
        </div>

        <form className="header__search" onSubmit={submit} role="search">
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={`Найти по названию среди ${total || 100}+ ${plural(total || 100, ['лекарства', 'лекарств', 'лекарств'])}…`}
            aria-label="Поиск препаратов" />
          <button className="header__search-btn" aria-label="Найти"><SearchIcon size={20} /></button>
        </form>

        <nav className="header__icons">
          {isAdmin && <IconLink to="/admin" icon={ChartIcon} label="Админка" secondary />}
          <IconLink to="/cart" icon={CartIcon} label="Корзина" count={count} />
          <IconLink to="/orders" icon={BoxIcon} label="Мои заказы" secondary />
          <IconLink to="/favorites" icon={HeartIcon} label="Избранное" count={favorites.count} />
          {user ? (
            <>
              <IconLink to="/profile" icon={UserIcon} label={user.full_name.split(' ')[0]} />
              <IconLink icon={LogoutIcon} label="Выйти" secondary onClick={() => { logout(); navigate('/') }} />
            </>
          ) : <IconLink to="/login" icon={UserIcon} label="Войти" />}
        </nav>
      </div>

      <div className="container catstrip" role="navigation" aria-label="Категории">
        <Link to="/catalog?on_sale=true" className={`catchip catchip--sale ${onSale ? 'is-on' : ''}`}>
          <TagIcon size={16} /> Акции
        </Link>
        {categories.map((c) => (
          <Link key={c.id} to={`/catalog?category_id=${c.id}`}
            className={`catchip ${activeCategory === String(c.id) ? 'is-on' : ''}`}>{c.name}</Link>
        ))}
      </div>
    </header>
  )
}
