import { useEffect, useState } from 'react'
import { favoritesApi } from '../api'
import { errorMessage } from '../api/client'
import MedicineCard from '../components/MedicineCard'
import { EmptyState, ErrorState, Loader } from '../components/States'
import { useFavorites } from '../context/FavoritesContext'

export default function Favorites() {
  const { ids } = useFavorites()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  const load = () => favoritesApi.list().then(setItems).catch((e) => setError(errorMessage(e)))
  useEffect(() => { load() }, [])

  if (error) return <div className="container page"><ErrorState text={error} onRetry={load} /></div>
  if (!items) return <Loader />

  // Убранные сердечком исчезают сразу, без перезагрузки
  const visible = items.filter((m) => ids.has(m.id))

  return (
    <div className="container page">
      <div className="page__head"><h1>Избранное</h1></div>
      {visible.length === 0
        ? <EmptyState icon="♡" title="В избранном пока пусто" text="Нажмите на сердечко у препарата, чтобы сохранить его здесь." action="Перейти в каталог" to="/catalog" />
        : <div className="grid-4">{visible.map((m) => <MedicineCard key={m.id} medicine={m} />)}</div>}
    </div>
  )
}
