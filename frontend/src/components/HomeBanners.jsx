import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon } from './Icons'

const AUTOPLAY_MS = 5000

/** Ссылка баннера: внутренняя — через роутер, внешняя — в новой вкладке, без ссылки — просто блок. */
function BannerLink({ href, className, children, label }) {
  if (!href) return <div className={className}>{children}</div>
  if (href.startsWith('/')) return <Link to={href} className={className} aria-label={label}>{children}</Link>
  return <a href={href} className={className} target="_blank" rel="noreferrer" aria-label={label}>{children}</a>
}

/**
 * Один баннер:
 *  - картинка + show_text — фото фоном, заголовок и подпись поверх на затемнении;
 *  - картинка без show_text — картинка целиком (текст уже на ней), title идёт в alt;
 *  - без картинки — текст на цветном фоне темы.
 */
export function BannerCard({ banner, className = '' }) {
  const hasImage = Boolean(banner.image_url)
  const showText = !hasImage || banner.show_text !== false
  const kind = hasImage ? (showText ? 'hb--photo' : 'hb--image') : ''
  return (
    <BannerLink href={banner.link_url} label={banner.title}
      className={`hb hb--${banner.theme} ${kind} ${className}`}>
      {hasImage && <img key={banner.image_url} src={banner.image_url} alt={showText ? "" : banner.title} loading="lazy" />}
      {showText && (
        <div className="hb__text">
          <h3>{banner.title}</h3>
          {banner.subtitle && <p>{banner.subtitle}</p>}
        </div>
      )}
    </BannerLink>
  )
}

function Slider({ slides }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchX = useRef(null)
  const count = slides.length

  const go = useCallback((i) => setIndex((i + count) % count), [count])

  useEffect(() => {
    if (paused || count < 2) return undefined
    const t = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS)
    return () => clearInterval(t)
  }, [paused, count])

  const onTouchEnd = (e) => {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1))
    touchX.current = null
  }

  return (
    <div className="hb-slider" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX }} onTouchEnd={onTouchEnd}
      aria-roledescription="карусель">
      <div className="hb-slider__track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((b, i) => (
          <div className="hb-slider__slide" key={b.id} aria-hidden={i !== index}>
            <BannerCard banner={b} />
          </div>
        ))}
      </div>
      {count > 1 && (
        <>
          <button className="hb-slider__arrow hb-slider__arrow--prev" onClick={() => go(index - 1)} aria-label="Предыдущий баннер">
            <ArrowLeftIcon size={18} />
          </button>
          <button className="hb-slider__arrow hb-slider__arrow--next" onClick={() => go(index + 1)} aria-label="Следующий баннер">
            <ArrowLeftIcon size={18} style={{ transform: 'scaleX(-1)' }} />
          </button>
          <div className="hb-slider__dots">
            {slides.map((b, i) => (
              <button key={b.id} className={i === index ? 'is-active' : ''} onClick={() => go(i)} aria-label={`Баннер ${i + 1}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** Блок баннеров на главной для вошедших: большая карусель слева и до двух малых справа. */
export default function HomeBanners({ banners }) {
  const slides = banners.filter((b) => b.placement === 'slider')
  const side = banners.filter((b) => b.placement === 'side').slice(0, 2)
  if (!slides.length && !side.length) return null
  return (
    <section className="home-banners">
      <div className={`hb-grid ${side.length ? '' : 'hb-grid--solo'} ${slides.length ? '' : 'hb-grid--side-only'}`}>
        {slides.length > 0 && <Slider slides={slides} />}
        {side.length > 0 && (
          <div className="hb-side">{side.map((b) => <BannerCard key={b.id} banner={b} />)}</div>
        )}
      </div>
    </section>
  )
}
