/** Пагинация с многоточиями: 1 … 4 5 6 … 10 */
export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null
  const items = []
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) items.push(p)
    else if (items[items.length - 1] !== '…') items.push('…')
  }
  return (
    <nav className="pager" aria-label="Страницы">
      <button className="pager__btn" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Назад">‹</button>
      {items.map((p, i) => (p === '…'
        ? <span key={`e${i}`} className="pager__gap">…</span>
        : <button key={p} className={`pager__btn ${p === page ? 'is-on' : ''}`} aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}>{p}</button>))}
      <button className="pager__btn" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Вперёд">›</button>
    </nav>
  )
}
