import { Link } from 'react-router-dom'

export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="#00A19A" />
      <path d="M14 7v14M7 14h14" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

export default function Logo({ to = '/' }) {
  return (
    <Link to={to} className="logo">
      <LogoMark />
      <span>Darmon</span>
    </Link>
  )
}
