import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../api'
import { TOKEN_KEY } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)))

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [])

  // При загрузке страницы восстанавливаем пользователя по сохранённому токену
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return
    authApi.me()
      .then(setUser)
      .catch(logout)
      .finally(() => setLoading(false))
  }, [logout])

  useEffect(() => {
    window.addEventListener('auth:expired', logout)
    return () => window.removeEventListener('auth:expired', logout)
  }, [logout])

  const applyToken = ({ access_token: token, user: u }) => {
    localStorage.setItem(TOKEN_KEY, token)
    setUser(u)
    return u
  }

  const value = useMemo(() => ({
    user,
    loading,
    isAdmin: user?.role === 'admin',
    login: (email, password) => authApi.login(email, password).then(applyToken),
    register: (payload) => authApi.register(payload).then(applyToken),
    updateProfile: (payload) => authApi.updateMe(payload).then((u) => { setUser(u); return u }),
    logout,
  }), [user, loading, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
