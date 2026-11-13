import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CART_KEY = 'pharmacy_cart'
const CartContext = createContext(null)

function readCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Снимок препарата для корзины: всё, что нужно для отображения без запроса к API. */
const snapshot = (m) => ({
  id: m.id,
  name: m.name,
  dosage: m.dosage,
  form: m.form,
  package: m.package,
  image_url: m.image_url,
  price: m.price,
  final_price: m.final_price,
  discount_percent: m.discount_percent,
  stock: m.stock,
  requires_prescription: m.requires_prescription,
})

export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart)

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  }, [items])

  const value = useMemo(() => {
    const quantityOf = (id) => items.find((i) => i.id === id)?.quantity || 0

    /** Добавляет товар, не превышая остаток. Возвращает фактически добавленное количество. */
    const add = (medicine, qty = 1) => {
      const current = quantityOf(medicine.id)
      const allowed = Math.max(0, Math.min(qty, medicine.stock - current))
      if (allowed === 0) return 0
      setItems((prev) => {
        const exists = prev.some((i) => i.id === medicine.id)
        return exists
          ? prev.map((i) => (i.id === medicine.id ? { ...snapshot(medicine), quantity: i.quantity + allowed } : i))
          : [...prev, { ...snapshot(medicine), quantity: allowed }]
      })
      return allowed
    }

    const setQuantity = (id, qty) => {
      setItems((prev) => prev
        .map((i) => (i.id === id ? { ...i, quantity: Math.max(0, Math.min(qty, i.stock)) } : i))
        .filter((i) => i.quantity > 0))
    }

    /** Обновляет цены и остатки после свежей загрузки препаратов из API. */
    const refresh = (medicines) => {
      const byId = new Map(medicines.map((m) => [m.id, m]))
      setItems((prev) => prev.map((i) => {
        const fresh = byId.get(i.id)
        return fresh ? { ...snapshot(fresh), quantity: Math.min(i.quantity, fresh.stock) || i.quantity } : i
      }))
    }

    return {
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      total: items.reduce((s, i) => s + i.final_price * i.quantity, 0),
      quantityOf,
      add,
      setQuantity,
      remove: (id) => setItems((prev) => prev.filter((i) => i.id !== id)),
      clear: () => setItems([]),
      refresh,
    }
  }, [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
