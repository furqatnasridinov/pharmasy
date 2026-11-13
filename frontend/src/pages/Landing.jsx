import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { categoriesApi, medicinesApi, promotionsApi } from '../api'
import { ClockIcon, DocIcon, GridIcon, HomeIcon, SearchIcon, TruckIcon } from '../components/Icons'
import MedicineCard from '../components/MedicineCard'
import PromoBanners from '../components/PromoBanners'
import { Loader } from '../components/States'
import { plural } from '../utils/format'

function useCountdownToMidnight() {
  const calc = () => {
    const now = new Date()
    const end = new Date(now)
    end.setHours(24, 0, 0, 0)
    const s = Math.max(0, Math.floor((end - now) / 1000))
    return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0'))
  }
  const [time, setTime] = useState(calc)
  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(t)
  }, [])
  return time
}

const TESTIMONIALS = [
  { name: 'Мадина С.', date: '2 ноября', rating: 5, text: 'Заказала Цетрин вечером, через полтора часа курьер уже был у двери. Удобно, что видно, сколько осталось на складе.' },
  { name: 'Рустам Н.', date: '28 октября', rating: 5, text: 'Беру витамины для всей семьи. Цены ниже, чем в аптеке у дома, а самовывоз — по дороге с работы.' },
  { name: 'Нигина Х.', date: '19 октября', rating: 4, text: 'Понравилось, что рецептурные препараты сразу помечены и написано, что нужен рецепт. Никаких сюрпризов на кассе.' },
]

const FAQ = [
  { q: 'Нужно ли регистрироваться?', a: 'Каталог открыт для всех. Чтобы оформить заказ, добавить препарат в избранное или оставить отзыв, нужен аккаунт — регистрация занимает минуту.' },
  { q: 'Как купить рецептурный препарат?', a: 'Рецептурные препараты отмечены бейджем «По рецепту». Оформите заказ как обычно, а рецепт врача покажите провизору при получении — без него препарат не выдадут.' },
  { q: 'Можно ли отменить заказ?', a: 'Да, пока заказ в статусе «Новый» — отмените его в разделе «Мои заказы». После того как аптека приняла заказ, отмена возможна по телефону.' },
  { q: 'Сколько стоит доставка?', a: 'Доставка по Душанбе — 15 смн, для заказов от 200 смн — бесплатно. Самовывоз из аптеки на пр. Рудаки, 12 всегда бесплатный.' },
]

export default function Landing() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [data, setData] = useState({ promos: [], deals: [], hits: [], categories: [], loading: true })
  const [openFaq, setOpenFaq] = useState(0)
  const [h, m, s] = useCountdownToMidnight()

  useEffect(() => {
    Promise.all([promotionsApi.active(), medicinesApi.deals(4), medicinesApi.bestsellers(8), categoriesApi.list()])
      .then(([promos, deals, hits, categories]) => setData({ promos, deals, hits, categories, loading: false }))
      .catch(() => setData((d) => ({ ...d, loading: false })))
  }, [])

  const total = data.categories.reduce((sum, c) => sum + c.medicines_count, 0)

  const search = (e) => {
    e.preventDefault()
    navigate(query.trim() ? `/catalog?search=${encodeURIComponent(query.trim())}` : '/catalog')
  }

  return (
    <div className="landing">
      <section className="hero container">
        <div>
          <h1>Аптека, которая привезёт лекарства домой</h1>
          <p className="lead">Найдите препарат, оформите заказ за пару минут и заберите его в аптеке или получите курьером. Каждый препарат проверяем по сроку годности.</p>
          <form className="hero__search" onSubmit={search}>
            <SearchIcon />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Например, Нурофен или витамин D" aria-label="Поиск" />
            <button className="btn btn--primary">Найти</button>
          </form>
          <div className="facts">
            <div><b>{total || '100+'}</b>{plural(total || 100, ['препарат', 'препарата', 'препаратов'])} в каталоге</div>
            <div><b>2 часа</b>доставка по Душанбе</div>
            <div><b>4,8 ★</b>средняя оценка покупателей</div>
          </div>
        </div>
        <div className="hero-tracker" aria-hidden="true">
          <div className="hero-tracker__top"><h3>Заказ №1048</h3><span>Доставка</span></div>
          <ol className="vsteps">
            <li className="done"><i /><div><b>Заказ создан</b><small>3 препарата</small></div><time>14:02</time></li>
            <li className="done"><i /><div><b>Принят аптекой</b><small>Провизор проверил наличие</small></div><time>14:10</time></li>
            <li className="now"><i /><div><b>Собран и готов</b><small>Курьер забирает заказ</small></div><time>14:35</time></li>
            <li><i /><div><b>Доставлен</b><small>Ожидается до 16:00</small></div><time /></li>
          </ol>
          <div className="mini-receipt">
            <div><span>Терафлю Экстра × 2</span>89,60 смн</div>
            <div><span>Називин × 1</span>17 смн</div>
            <div><span>Цетрин × 1</span>27 смн</div>
            <div className="mini-receipt__total"><span>Итого</span>133,60 смн</div>
          </div>
        </div>
      </section>

      {data.loading && <Loader />}

      {data.promos.length > 0 && (
        <section className="section section--alt">
          <div className="container">
            <div className="section__head">
              <div><h2>Акции и предложения</h2><p className="sub">Скидки действуют до даты, указанной на карточке.</p></div>
              <Link to="/catalog?on_sale=true" className="btn btn--line">Все товары со скидкой</Link>
            </div>
            <PromoBanners promotions={data.promos} />
          </div>
        </section>
      )}

      {data.deals.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section__head">
              <div><h2>Выгодно сегодня</h2><p className="sub">Каждый день выбираем несколько препаратов со скидкой до полуночи.</p></div>
              <div className="timer" aria-label={`До конца дня ${h}:${m}:${s}`}>
                До конца дня <b><span>{h}</span>:<span>{m}</span>:<span>{s}</span></b>
              </div>
            </div>
            <div className="grid-4">{data.deals.map((d) => <MedicineCard key={d.id} medicine={d} variant="deal" />)}</div>
          </div>
        </section>
      )}

      <section className="section section--alt">
        <div className="container">
          <h2>Всё, что нужно от аптеки, в одном месте</h2>
          <p className="sub">Ищите по названию, сравнивайте цены и отзывы, следите за заказом онлайн.</p>
          <div className="benefits">
            <div className="benefit benefit--big">
              <span className="benefit__ico"><GridIcon /></span>
              <h3>Широкий ассортимент</h3>
              <p>Обезболивающие, антибиотики, витамины, средства от простуды и аллергии. Для каждого препарата указаны форма выпуска, дозировка, производитель и остаток на складе.</p>
              <div className="benefit__facts">
                <div><b>{data.categories.length || 8} категорий</b>от ЖКТ до дерматологии</div>
                <div><b>Таблетки, сиропы</b>капли, мази, растворы</div>
                <div><b>Фильтры</b>по цене и наличию</div>
                <div><b>Отзывы</b>и рейтинг препаратов</div>
              </div>
            </div>
            <div className="benefit"><span className="benefit__ico"><TruckIcon /></span><h3>Доставка на дом</h3><p>Курьер привезёт заказ по Душанбе в течение двух часов.</p></div>
            <div className="benefit"><span className="benefit__ico"><HomeIcon /></span><h3>Самовывоз</h3><p>Заберите заказ в аптеке, как только он получит статус «Готов».</p></div>
            <div className="benefit"><span className="benefit__ico"><ClockIcon /></span><h3>Свежие сроки годности</h3><p>Просроченные препараты не попадают в продажу — система отмечает их автоматически.</p></div>
            <div className="benefit"><span className="benefit__ico"><DocIcon /></span><h3>Рецептурные препараты</h3><p>Помечены отдельно. Выдаём их только при наличии рецепта врача.</p></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Как оформить заказ</h2>
          <ol className="how">
            <li><span>Шаг 1</span><h4>Найдите препарат</h4><p>Через поиск или по категориям каталога.</p></li>
            <li><span>Шаг 2</span><h4>Добавьте в корзину</h4><p>Количество ограничено остатком — лишнего не закажете.</p></li>
            <li><span>Шаг 3</span><h4>Выберите получение</h4><p>Самовывоз или доставка по адресу, комментарий по желанию.</p></li>
            <li><span>Шаг 4</span><h4>Следите за статусом</h4><p>В личном кабинете видно, когда заказ принят и готов.</p></li>
          </ol>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <div className="section__head"><h2>Категории</h2><Link to="/catalog" className="btn btn--line">Открыть весь каталог</Link></div>
          <div className="cats">
            {data.categories.map((c) => (
              <Link key={c.id} to={`/catalog?category_id=${c.id}`} className="cat-tile">
                <div><b>{c.name}</b><span>{c.medicines_count} {plural(c.medicines_count, ['препарат', 'препарата', 'препаратов'])}</span></div>
                <span className="cat-tile__arr" aria-hidden="true">›</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {data.hits.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section__head">
              <div><h2>Хиты продаж</h2><p className="sub">Препараты, которые покупатели заказывают чаще всего.</p></div>
              <Link to="/catalog?sort=rating" className="btn btn--line">Смотреть все</Link>
            </div>
            <div className="grid-4">{data.hits.map((m) => <MedicineCard key={m.id} medicine={m} />)}</div>
          </div>
        </section>
      )}

      <section className="section section--alt">
        <div className="container">
          <h2>Доставка и самовывоз</h2>
          <p className="sub">Способ получения выбирается при оформлении заказа.</p>
          <div className="delivery">
            <div className="delivery__card delivery__card--accent">
              <h3>Доставка на дом</h3><p className="pp">Бесплатно от 200 смн, иначе 15 смн</p>
              <ul><li>Курьер приезжает в течение 2 часов после сборки</li><li>Укажите адрес и комментарий для курьера</li><li>Оплата при получении картой или наличными</li></ul>
            </div>
            <div className="delivery__card">
              <h3>Самовывоз из аптеки</h3><p className="pp">Бесплатно · Душанбе, пр. Рудаки, 12 · 8:00–22:00</p>
              <ul><li>Заказ собирают за 30–40 минут</li><li>В личном кабинете статус сменится на «Готов»</li><li>Заказ хранится 3 дня</li></ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Отзывы покупателей</h2>
          <div className="testimonials">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="testimonial">
                <div className="testimonial__stars">{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</div>
                <blockquote>{t.text}</blockquote>
                <figcaption><b>{t.name}</b> · {t.date}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container faq">
          <div><h2>Частые вопросы</h2><p className="sub">Не нашли ответ — позвоните нам: +992 00 000-00-00.</p></div>
          <div>
            {FAQ.map((f, i) => (
              <div key={f.q} className="faq__item">
                <button className="faq__q" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                  {f.q}<span aria-hidden="true">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && <p className="faq__a">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta">
            <div><h2>Зарегистрируйтесь и закажите первые лекарства</h2><p>В личном кабинете — история заказов, статусы доставки и избранные препараты.</p></div>
            <div className="cta__btns">
              <Link to="/register" className="btn btn--primary btn--lg">Создать аккаунт</Link>
              <Link to="/login" className="btn btn--outline-light btn--lg">Войти</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
