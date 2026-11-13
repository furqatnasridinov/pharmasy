import { formatShortDate, ORDER_STATUS } from '../utils/format'

export function Badge({ tone = 'grey', children, title }) {
  return <span className={`badge badge--${tone}`} title={title}>{children}</span>
}

/** Набор бейджей препарата: рецепт, скидка, срок годности, наличие. */
export function MedicineBadges({ medicine, showStock = true, showDiscount = false }) {
  const m = medicine
  return (
    <>
      {m.requires_prescription && <Badge tone="rx">По рецепту</Badge>}
      {showDiscount && m.discount_percent > 0 && <Badge tone="sale">−{m.discount_percent}%</Badge>}
      {m.expiry_status === 'expired' && <Badge tone="red">Просрочено</Badge>}
      {m.expiry_status === 'expiring' && (
        <Badge tone="amber" title={`Годен до ${formatShortDate(m.expiry_date)}`}>
          Истекает {formatShortDate(m.expiry_date).slice(0, 5)}
        </Badge>
      )}
      {showStock && m.stock === 0 && m.expiry_status !== 'expired' && <Badge>Нет в наличии</Badge>}
    </>
  )
}

export function StatusBadge({ status }) {
  const s = ORDER_STATUS[status] || { label: status, tone: 'grey' }
  return <span className={`status status--${s.tone}`}>{s.label}</span>
}
