import { Link } from 'react-router-dom'
import { LogoMark } from './Logo'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <div className="logo"><LogoMark size={26} /><span>Darmon</span></div>
          <p>Интернет-аптека в Худжанде. Учебный проект.</p>
        </div>
        <div>
          <b>Покупателям</b>
          <Link to="/catalog">Каталог</Link>
          <Link to="/catalog?on_sale=true">Акции</Link>
          <Link to="/cart">Корзина</Link>
        </div>
        <div>
          <b>Аккаунт</b>
          <Link to="/login">Войти</Link>
          <Link to="/register">Регистрация</Link>
          <Link to="/orders">Мои заказы</Link>
        </div>
        <div>
          <b>Контакты</b>
          <span>+992 00 000-00-00</span>
          <span>Худжанд, ул. Камоли Худжанди, 12</span>
          <span>Ежедневно 8:00–22:00</span>
        </div>
        <p className="footer__warn">Имеются противопоказания. Перед применением проконсультируйтесь со специалистом.</p>
      </div>
    </footer>
  )
}
