export default function QuantityControl({ value, max, onChange, min = 0, compact = false }) {
  return (
    <div className={`qty ${compact ? 'qty--compact' : ''}`}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Уменьшить">−</button>
      <span aria-live="polite">{value}</span>
      <button type="button" className="qty__plus" onClick={() => onChange(value + 1)} disabled={value >= max}
        aria-label="Увеличить" title={value >= max ? `В наличии только ${max} шт.` : undefined}>+</button>
    </div>
  )
}
