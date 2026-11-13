import { useEffect, useState } from 'react'

// Выбор пользователя: 'light' | 'dark' | 'auto'. Применённая тема — атрибут data-theme на <html>.
// Тот же код (в упрощённом виде) выполняется в index.html до загрузки React, чтобы не было вспышки.
export const THEME_KEY = 'theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

function readPref() {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'light' || v === 'dark' ? v : 'auto'
  } catch { return 'auto' }
}

function apply(pref) {
  const dark = pref === 'dark' || (pref === 'auto' && media.matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export default function useTheme() {
  const [pref, setPref] = useState(readPref)

  useEffect(() => {
    apply(pref)
    try {
      if (pref === 'auto') localStorage.removeItem(THEME_KEY)
      else localStorage.setItem(THEME_KEY, pref)
    } catch { /* приватный режим — просто не запоминаем */ }
    if (pref !== 'auto') return undefined
    const onChange = () => apply('auto')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [pref])

  return [pref, setPref]
}
