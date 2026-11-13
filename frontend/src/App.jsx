import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Footer from './components/Footer'
import Header from './components/Header'
import { Loader } from './components/States'
import { useAuth } from './context/AuthContext'
import AdminLayout from './pages/admin/AdminLayout'
import AdminCategories from './pages/admin/Categories'
import AdminDashboard from './pages/admin/Dashboard'
import AdminMedicines from './pages/admin/Medicines'
import AdminOrders from './pages/admin/Orders'
import AdminPromotions from './pages/admin/Promotions'
import AdminReviews from './pages/admin/Reviews'
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

/** Гость видит лендинг, вошедший пользователь — сразу каталог. */
function Home() {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  return user ? <Catalog /> : <Landing />
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  const { pathname } = useLocation()
  const inAdmin = pathname.startsWith('/admin')

  return (
    <>
      <ScrollToTop />
      {!inAdmin && <Header />}
      <main className={inAdmin ? '' : 'main'}>
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
            <Route path="reviews" element={<AdminReviews />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!inAdmin && <Footer />}
    </>
  )
}
