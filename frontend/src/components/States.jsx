import { Link } from 'react-router-dom'

export function Loader({ text = 'Загружаем…' }) {
  return (
    <div className="loader" role="status">
      <span className="loader__spin" aria-hidden="true" />
      <span>{text}</span>
    </div>
  )
}

export function EmptyState({ title, text, action, to, onAction, icon = '💊' }) {
  return (
    <div className="empty">
      <div className="empty__icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action && to && <Link to={to} className="btn btn--primary">{action}</Link>}
      {action && onAction && <button className="btn btn--primary" onClick={onAction}>{action}</button>}
    </div>
  )
}

export function ErrorState({ text, onRetry }) {
  return (
    <div className="empty">
      <div className="empty__icon" aria-hidden="true">⚠️</div>
      <h3>Не удалось загрузить данные</h3>
      <p>{text}</p>
      {onRetry && <button className="btn btn--line" onClick={onRetry}>Повторить</button>}
    </div>
  )
}
