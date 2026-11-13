import { Link } from 'react-router-dom'
import { TrashIcon } from '../components/Icons'
import MedicineImage from '../components/MedicineImage'
import QuantityControl from '../components/QuantityControl'
import { EmptyState } from '../components/States'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useConfirm } from '../context/ConfirmContext'
import { formatPrice, plural } from '../utils/format'

export default function Cart() {
  const { items, count, total, setQuantity, remove, clear } = useCart()
  const { user } = useAuth()
  const confirm = useConfirm()

  if (items.length === 0) {
    return (
      <div className="container page">
        <EmptyState icon="🛒" title="Корзина пуста" text="Добавьте препараты из каталога — они появятся здесь." action="Перейти в каталог" to="/catalog" />
      </div>
    )
  }

  const onClear = async () => {
    if (await confirm({ title: 'Очистить корзину?', message: 'Все препараты будут удалены из корзины.', confirmText: 'Очистить' })) clear()
  }

  const hasRx = items.some((i) => i.requires_prescription)

  return (
    <div className="container page">
      <div className="page__head">
        <h1>Корзина</h1>
        <button className="link link--danger" onClick={onClear}>Очистить корзину</button>
      </div>
      <div className="cart-layout">
        <ul className="cart-list">
          {items.map((i) => (
            <li key={i.id} className="cart-item">
              <Link to={`/medicines/${i.id}`} className="cart-item__img"><MedicineImage src={i.image_url} alt={i.name} /></Link>
              <div className="cart-item__info">
                <Link to={`/medicines/${i.id}`} className="cart-item__name">{i.name}</Link>
                <span className="muted">{[i.form, i.dosage, i.package].filter(Boolean).join(' · ')}</span>
                {i.requires_prescription && <span className="badge badge--rx">По рецепту</span>}
                <span className="muted small">{formatPrice(i.final_price)} за шт. · в наличии {i.stock} шт.</span>
              </div>
              <QuantityControl value={i.quantity} min={1} max={i.stock} onChange={(n) => setQuantity(i.id, n)} />
              <b className="cart-item__sum">{formatPrice(i.final_price * i.quantity)}</b>
              <button className="icon-btn" onClick={() => remove(i.id)} aria-label={`Удалить ${i.name}`}><TrashIcon size={18} /></button>
            </li>
          ))}
        </ul>
        <aside className="summary">
          <h2>Итого</h2>
          <div className="summary__row"><span>{count} {plural(count, ['товар', 'товара', 'товаров'])}</span><span>{formatPrice(total)}</span></div>
          <div className="summary__total"><span>К оплате</span><span>{formatPrice(total)}</span></div>
          {hasRx && <p className="alert alert--rx small">В корзине есть рецептурные препараты — понадобится рецепт врача.</p>}
          <Link to={user ? '/checkout' : '/login'} state={user ? undefined : { from: '/checkout' }} className="btn btn--primary btn--block btn--lg">
            {user ? 'Перейти к оформлению' : 'Войти и оформить'}
          </Link>
          <Link to="/catalog" className="btn btn--ghost btn--block">Продолжить покупки</Link>
        </aside>
      </div>
    </div>
  )
}
