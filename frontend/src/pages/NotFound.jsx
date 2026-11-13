import { EmptyState } from '../components/States'

export default function NotFound() {
  return (
    <div className="container page">
      <EmptyState icon="🧭" title="Страница не найдена" text="Возможно, ссылка устарела. Начните с каталога." action="Открыть каталог" to="/catalog" />
    </div>
  )
}
