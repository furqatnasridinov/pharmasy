import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import QuantityControl from './QuantityControl'

/** «В корзину», а если товар уже в корзине — счётчик количества. */
export default function CartButton({ medicine, label = 'В корзину', block = false }) {
  const cart = useCart()
  const toast = useToast()
  const qty = cart.quantityOf(medicine.id)

  if (!medicine.is_available) {
    return (
      <button className={`btn btn--muted ${block ? 'btn--block' : ''}`} disabled>
        {medicine.expiry_status === 'expired' ? 'Недоступно' : 'Нет в наличии'}
      </button>
    )
  }

  if (qty > 0) {
    return (
      <QuantityControl value={qty} max={medicine.stock}
        onChange={(n) => {
          if (n > medicine.stock) return toast.show(`В наличии только ${medicine.stock} шт.`, 'info')
          cart.setQuantity(medicine.id, n)
          if (n === 0) toast.show(`«${medicine.name}» удалён из корзины`, 'info')
        }} />
    )
  }

  const add = () => {
    const added = cart.add(medicine, 1)
    if (added) toast.show(`«${medicine.name}» добавлен в корзину`)
    else toast.show(`В наличии только ${medicine.stock} шт.`, 'info')
  }

  return <button className={`btn btn--dark ${block ? 'btn--block' : ''}`} onClick={add}>{label}</button>
}
