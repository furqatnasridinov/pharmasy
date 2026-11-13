import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  /** type: 'success' | 'error' | 'info' */
  const show = useCallback((message, type = 'success') => {
    const id = nextId.current++
    setToasts((t) => [...t.slice(-3), { id, message, type }])
    setTimeout(() => dismiss(id), type === 'error' ? 5000 : 3000)
  }, [dismiss])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} onClick={() => dismiss(t.id)}>
            <span className="toast__icon" aria-hidden="true">{t.type === 'error' ? '!' : t.type === 'info' ? 'i' : '✓'}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
