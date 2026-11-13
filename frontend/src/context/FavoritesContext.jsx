import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { favoritesApi } from '../api'
import { errorMessage } from '../api/client'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

const FavoritesContext = createContext(null)

export function FavoritesProvider({ children }) {
  const { user } = useAuth()
  const toast = useToast()
  const [ids, setIds] = useState(new Set())

  useEffect(() => {
    if (!user) { setIds(new Set()); return }
    favoritesApi.ids().then((list) => setIds(new Set(list))).catch(() => {})
  }, [user])

  const toggle = useCallback(async (medicine) => {
    if (!user) {
      toast.show('Войдите, чтобы добавлять препараты в избранное', 'info')
      return
    }
    const isFav = ids.has(medicine.id)
    // Оптимистично обновляем сердечко, откатываем при ошибке
    setIds((prev) => {
      const next = new Set(prev)
      isFav ? next.delete(medicine.id) : next.add(medicine.id)
      return next
    })
    try {
      if (isFav) await favoritesApi.remove(medicine.id)
      else await favoritesApi.add(medicine.id)
      toast.show(isFav ? `«${medicine.name}» удалён из избранного` : `«${medicine.name}» добавлен в избранное`)
    } catch (e) {
      setIds((prev) => {
        const next = new Set(prev)
        isFav ? next.add(medicine.id) : next.delete(medicine.id)
        return next
      })
      toast.show(errorMessage(e), 'error')
    }
  }, [ids, user, toast])

  const value = useMemo(() => ({ ids, count: ids.size, isFavorite: (id) => ids.has(id), toggle }), [ids, toggle])
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export const useFavorites = () => useContext(FavoritesContext)
