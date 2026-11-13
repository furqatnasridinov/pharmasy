import { useEffect, useState } from 'react'

/** Аккуратная заглушка в стиле сайта — показывается, если картинки нет или ссылка не открылась. */
function Placeholder({ name }) {
  return (
    <svg className="med-img__placeholder" viewBox="0 0 200 200" role="img" aria-label={name || 'Изображение недоступно'}>
      <defs>
        <radialGradient id="ph-bg" cx="50%" cy="38%" r="70%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E6F1F2" />
        </radialGradient>
      </defs>
      <rect width="200" height="200" fill="url(#ph-bg)" />
      <ellipse cx="100" cy="160" rx="56" ry="8" fill="#0F2A33" opacity=".08" />
      <g transform="rotate(-30 100 100)">
        <rect x="52" y="82" width="96" height="40" rx="20" fill="#fff" stroke="#00A19A" strokeWidth="4" />
        <path d="M72 82h28v40H72a20 20 0 0 1 0-40Z" fill="#00A19A" />
      </g>
    </svg>
  )
}

export default function MedicineImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [src])

  return (
    <div className={`med-img ${className}`}>
      {src && !failed
        ? <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
        : <Placeholder name={alt} />}
    </div>
  )
}
