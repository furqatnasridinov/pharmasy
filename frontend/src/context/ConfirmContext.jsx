import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const ConfirmContext = createContext(null)

/** confirm({ title, message, confirmText }) → Promise<boolean> — модальное подтверждение действия. */
export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const resolver = useRef(null)
  const confirmBtn = useRef(null)

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current = resolve
    setDialog({ confirmText: 'Удалить', danger: true, ...options })
  }), [])

  const close = (result) => {
    resolver.current?.(result)
    setDialog(null)
  }

  useEffect(() => {
    if (!dialog) return
    confirmBtn.current?.focus()
    const onKey = (e) => e.key === 'Escape' && close(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="modal-backdrop" onClick={() => close(false)}>
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
            onClick={(e) => e.stopPropagation()}>
            <h3 id="confirm-title">{dialog.title}</h3>
            {dialog.message && <p>{dialog.message}</p>}
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => close(false)}>Отмена</button>
              <button ref={confirmBtn} className={`btn ${dialog.danger ? 'btn--danger' : 'btn--primary'}`}
                onClick={() => close(true)}>{dialog.confirmText}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => useContext(ConfirmContext)
