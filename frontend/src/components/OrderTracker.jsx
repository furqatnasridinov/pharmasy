const STEPS = [
  { key: 'new', label: 'Создан' },
  { key: 'accepted', label: 'Принят' },
  { key: 'ready', label: 'Готов' },
  { key: 'completed', label: 'Выдан' },
]

/** Горизонтальная полоска статуса заказа. */
export default function OrderTracker({ status }) {
  if (status === 'cancelled') return <div className="tracker tracker--cancelled">Заказ отменён</div>
  const current = STEPS.findIndex((s) => s.key === status)
  return (
    <ol className="tracker">
      {STEPS.map((s, i) => {
        const state = i < current || status === 'completed' ? 'done' : i === current ? 'now' : 'todo'
        return (
          <li key={s.key} className={`tracker__step tracker__step--${state}`}>
            <i aria-hidden="true" />{s.label}
          </li>
        )
      })}
    </ol>
  )
}
