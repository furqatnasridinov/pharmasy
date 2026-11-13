import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Footer from './components/Footer'
import Header from './components/Header'
import { Loader } from './components/States'
import { useAuth } from './context/AuthContext'
import AdminLayout from './pages/admin/AdminLayout'
import AdminBanners from './pages/admin/Banners'
import AdminCategories from './pages/admin/Categories'
import AdminDashboard from './pages/admin/Dashboard'
import AdminMedicines from './pages/admin/Medicines'
import AdminOrders from './pages/admin/Orders'
import AdminPromotions from './pages/admin/Promotions'
import AdminReviews from './pages/admin/Reviews'
import AdminUsers from './pages/admin/Users'
import Cart from './pages/Cart'
import Catalog from './pages/Catalog'
import Checkout from './pages/Checkout'
import Favorites from './pages/Favorites'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Medicine from './pages/Medicine'
import NotFound from './pages/NotFound'
import OrderDetail from './pages/OrderDetail'
import Orders from './pages/Orders'
import Profile from './pages/Profile'
import Register from './pages/Register'

function RequireAuth({ children, admin = false }) {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (admin && !isAdmin) return <Navigate to="/" replace />
  return children
}

/** Главная: покупателям и гостям — витрина, администратора сразу ведём в панель управления. */
function Home() {
  const { loading, isAdmin } = useAuth()
  if (loading) return <Loader />
  return isAdmin ? <Navigate to="/admin" replace /> : <Landing />
}

/** При смене страницы — наверх; ссылки вида /#delivery прокручивают к нужному блоку. */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) { window.scrollTo(0, 0); return undefined }
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 300)
    return () => clearTimeout(t)
  }, [pathname, hash])
  return null
}

export default function App() {
  const { pathname } = useLocation()
  const inAdmin = pathname.startsWith('/admin')
  // Вход и регистрация — отдельный экран без шапки и подвала сайта
  const isAuth = pathname === '/login' || pathname === '/register'
  const bare = inAdmin || isAuth

  return (
    <>
      <ScrollToTop />
      {!bare && <Header />}
      <main className={bare ? '' : 'main'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/medicines/:id" element={<Medicine />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="/favorites" element={<RequireAuth><Favorites /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="/orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth admin><AdminLayout /></RequireAuth>}>
            <Route index element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="medicines" element={<AdminMedicines />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="promotions" element={<AdminPromotions />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!bare && <Footer />}
    </>
  )
}
