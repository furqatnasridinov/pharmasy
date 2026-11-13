import axios from 'axios'

export const TOKEN_KEY = 'pharmacy_token'

// indexes: null → массивы уходят как ?form=a&form=b (так их ждёт FastAPI)
const client = axios.create({ baseURL: '/api', paramsSerializer: { indexes: null } })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Токен истёк — сообщаем AuthContext, чтобы он разлогинил пользователя
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      window.dispatchEvent(new Event('auth:expired'))
    }
    return Promise.reject(error)
  },
)

/** Текст ошибки из ответа FastAPI для toast-уведомления. */
export function errorMessage(error, fallback = 'Что-то пошло не так. Попробуйте ещё раз.') {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join('; ')
  if (error?.message === 'Network Error') return 'Нет связи с сервером. Проверьте подключение.'
  return fallback
}

export default client
