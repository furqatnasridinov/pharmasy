import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { adminApi } from '../../api'
import { BoxIcon, ChartIcon, FolderIcon, LogoutIcon, MenuIcon, StarIcon, TagIcon } from '../../components/Icons'
import { LogoMark } from '../../components/Logo'
import { useAuth } from '../../context/AuthContext'
import { initials } from '../../utils/format'

export const POLL_MS = 10_000

const AdminContext = createContext({ newOrders: 0, refreshCounts: () => {} })
export const useAdmin = () => useContext(AdminContext)

const NAV = [
  { to: '/admin', label: 'Дашборд', icon: ChartIcon, end: true },
  { to: '/admin/orders', label: 'Заказы', icon: BoxIcon, badge: true },
  { to: '/admin/medicines', label: 'Лекарства', icon: FolderIcon },
  { to: '/admin/categories', label: 'Категории', icon: FolderIcon },
  { to: '/admin/promotions', label: 'Акции', icon: TagIcon },
  { to: '/admin/reviews', label: 'Отзывы', icon: StarIcon },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [newOrders, setNewOrders] = useState(0)
  const [open, setOpen] = useState(false)

  const refreshCounts = useCallback(() => {
    adminApi.orderCounts().then((c) => setNewOrders(c.new || 0)).catch(() => {})
  }, [])

  // Счётчик новых заказов в меню обновляется каждые 10 секунд
  useEffect(() => {
    refreshCounts()
    const t = setInterval(refreshCounts, POLL_MS)
    return () => clearInterval(t)
  }, [refreshCounts])

  return (
    <AdminContext.Provider value={{ newOrders, refreshCounts }}>
      <div className="admin">
        <aside className={`admin__side ${open ? 'is-open' : ''}`}>
          <Link to="/admin" className="logo logo--light"><LogoMark /><span>Провизор</span></Link>
          <span className="admin__role">Панель администратора</span>
          <nav onClick={() => setOpen(false)}>
            {NAV.map(({ to, label, icon: Icon, end, badge }) => (
              <NavLink key={to} to={to} end={end} className="admin__link">
                <Icon size={18} /> {label}
                {badge && newOrders > 0 && <span className="admin__badge">{newOrders}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="admin__foot">
            <Link to="/" className="admin__link">← На сайт</Link>
            <div className="admin__me">
              <span className="avatar">{initials(user.full_name)}</span>
              <span><b>{user.full_name}</b><small>{user.email}</small></span>
              <button className="icon-btn" onClick={() => { logout(); navigate('/') }} aria-label="Выйти" title="Выйти">
                <LogoutIcon size={18} />
              </button>
            </div>
          </div>
        </aside>
        <div className="admin__main">
          <button className="admin__burger" onClick={() => setOpen((v) => !v)} aria-label="Меню"><MenuIcon /> Меню</button>
          <Outlet />
        </div>
      </div>
    </AdminContext.Provider>
  )
}
