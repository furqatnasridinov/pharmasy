import client from './client'

const data = (promise) => promise.then((r) => r.data)

export const authApi = {
  login: (email, password) => data(client.post('/auth/login', { email, password })),
  register: (payload) => data(client.post('/auth/register', payload)),
  me: () => data(client.get('/auth/me')),
  updateMe: (payload) => data(client.patch('/auth/me', payload)),
}

export const categoriesApi = {
  list: () => data(client.get('/categories')),
  create: (payload) => data(client.post('/categories', payload)),
  update: (id, payload) => data(client.put(`/categories/${id}`, payload)),
  remove: (id) => data(client.delete(`/categories/${id}`)),
}

export const medicinesApi = {
  list: (params) => data(client.get('/medicines', { params })),
  get: (id) => data(client.get(`/medicines/${id}`)),
  facets: (params) => data(client.get('/medicines/facets', { params })),
  deals: (limit = 8) => data(client.get('/medicines/deals', { params: { limit } })),
  bestsellers: (limit = 8) => data(client.get('/medicines/bestsellers', { params: { limit } })),
  create: (payload) => data(client.post('/medicines', payload)),
  update: (id, payload) => data(client.put(`/medicines/${id}`, payload)),
  updateStock: (id, stock) => data(client.patch(`/medicines/${id}/stock`, { stock })),
  remove: (id) => data(client.delete(`/medicines/${id}`)),
  uploadImage: (id, file) => {
    const form = new FormData()
    form.append('file', file)
    return data(client.post(`/medicines/${id}/image`, form))
  },
}

export const reviewsApi = {
  list: (medicineId) => data(client.get(`/medicines/${medicineId}/reviews`)),
  create: (medicineId, payload) => data(client.post(`/medicines/${medicineId}/reviews`, payload)),
  update: (id, payload) => data(client.put(`/reviews/${id}`, payload)),
  remove: (id) => data(client.delete(`/reviews/${id}`)),
}

export const favoritesApi = {
  list: () => data(client.get('/favorites')),
  ids: () => data(client.get('/favorites/ids')),
  add: (medicineId) => data(client.post(`/favorites/${medicineId}`)),
  remove: (medicineId) => data(client.delete(`/favorites/${medicineId}`)),
}

export const ordersApi = {
  create: (payload) => data(client.post('/orders', payload)),
  my: () => data(client.get('/orders/my')),
  get: (id) => data(client.get(`/orders/${id}`)),
  cancel: (id) => data(client.post(`/orders/${id}/cancel`)),
}

export const bannersApi = {
  active: () => data(client.get('/banners')),
}

export const promotionsApi = {
  active: () => data(client.get('/promotions')),
}

export const adminApi = {
  dashboard: () => data(client.get('/admin/dashboard')),
  orders: (status) => data(client.get('/admin/orders', { params: status ? { status } : {} })),
  orderCounts: () => data(client.get('/admin/orders/counts')),
  setOrderStatus: (id, status) => data(client.patch(`/admin/orders/${id}/status`, { status })),
  reviews: () => data(client.get('/admin/reviews')),
  updateReview: (id, payload) => data(client.put(`/reviews/${id}`, payload)),
  editOrder: (id, payload) => data(client.put(`/admin/orders/${id}`, payload)),
  users: () => data(client.get('/admin/users')),
  createUser: (payload) => data(client.post('/admin/users', payload)),
  updateUser: (id, payload) => data(client.put(`/admin/users/${id}`, payload)),
  removeUser: (id) => data(client.delete(`/admin/users/${id}`)),
  promotions: () => data(client.get('/admin/promotions')),
  createPromotion: (payload) => data(client.post('/admin/promotions', payload)),
  updatePromotion: (id, payload) => data(client.put(`/admin/promotions/${id}`, payload)),
  removePromotion: (id) => data(client.delete(`/admin/promotions/${id}`)),
  banners: () => data(client.get('/admin/banners')),
  createBanner: (payload) => data(client.post('/admin/banners', payload)),
  updateBanner: (id, payload) => data(client.put(`/admin/banners/${id}`, payload)),
  removeBanner: (id) => data(client.delete(`/admin/banners/${id}`)),
  uploadBannerImage: (id, file) => {
    const form = new FormData()
    form.append('file', file)
    return data(client.post(`/admin/banners/${id}/image`, form))
  },
}
