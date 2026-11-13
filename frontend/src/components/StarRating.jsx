import { useState } from 'react'

/** Отображение рейтинга (value) или ввод оценки (onChange). */
export default function StarRating({ value = 0, onChange, size = 16, count }) {
  const [hover, setHover] = useState(0)
  const interactive = typeof onChange === 'function'
  const shown = hover || value

  if (!interactive) {
    const rounded = Math.round(value || 0)
    return (
      <span className="stars" style={{ fontSize: size }} aria-label={`Рейтинг ${value || 0} из 5`}>
        <span className="stars__icons">{'★'.repeat(rounded)}<span className="stars__empty">{'★'.repeat(5 - rounded)}</span></span>
        {value ? <span className="stars__value">{Number(value).toFixed(1).replace('.', ',')}</span> : null}
        {count !== undefined && <span className="stars__count">({count})</span>}
      </span>
    )
  }

  return (
    <span className="stars stars--input" style={{ fontSize: size }} role="radiogroup" aria-label="Оценка"
      onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} из 5`}
          className={n <= shown ? 'is-on' : ''} onMouseEnter={() => setHover(n)} onClick={() => onChange(n)}>★</button>
      ))}
    </span>
  )
}
