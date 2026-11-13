import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'
import { initials } from '../utils/format'
import { CartIcon, CloseIcon, HeartIcon, LogoutIcon, MenuIcon, SearchIcon } from './Icons'
import Logo from './Logo'

export default function Header() {
  const { user, isAdmin, logout } = useAuth()
  const { count } = useCart()
  const favorites = useFavorites()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('search') || '')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
    if (location.pathname === '/catalog' || location.pathname === '/') setQuery(params.get('search') || '')
  }, [location.pathname, location.search]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/catalog?search=${encodeURIComponent(q)}` : '/catalog')
  }

  const onLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="header">
      <div className="header__inner">
        <Logo />

        <form className="header__search" onSubmit={submit} role="search">
          <SearchIcon size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию или действующему веществу" aria-label="Поиск препаратов" />
        </form>

        <button className="header__burger" onClick={() => setMenuOpen((v) => !v)} aria-label="Меню">
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        <nav className={`header__nav ${menuOpen ? 'is-open' : ''}`}>
          <NavLink to="/catalog" end className="nav-link">Каталог</NavLink>
          <Link to="/catalog?on_sale=true" className="nav-link nav-link--sale">Акции</Link>
          {user && (
            <NavLink to="/favorites" className="nav-link">
              <HeartIcon size={18} /> Избранное {favorites.count > 0 && <span className="count">{favorites.count}</span>}
            </NavLink>
          )}
          {user && <NavLink to="/orders" className="nav-link">Мои заказы</NavLink>}
          {isAdmin && <NavLink to="/admin" className="nav-link nav-link--admin">Админка</NavLink>}
          <NavLink to="/cart" className="nav-link nav-link--cart">
            <CartIcon size={18} /> Корзина {count > 0 && <span className="count count--accent">{count}</span>}
          </NavLink>

          {user ? (
            <div className="header__me">
              <Link to="/profile" className="me" title="Личный кабинет">
                <span className="avatar">{initials(user.full_name)}</span>
                <span className="me__text"><b>{user.full_name}</b><small>Профиль</small></span>
              </Link>
              <button className="icon-btn" onClick={onLogout} title="Выйти" aria-label="Выйти"><LogoutIcon size={18} /></button>
            </div>
          ) : (
            <div className="header__auth">
              <Link to="/login" className="btn btn--ghost">Войти</Link>
              <Link to="/register" className="btn btn--dark">Регистрация</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
