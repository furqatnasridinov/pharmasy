import useTheme from '../hooks/useTheme'
import { MonitorIcon, MoonIcon, SunIcon } from './Icons'

const OPTIONS = [
  { value: 'light', label: 'Светлая тема', icon: SunIcon },
  { value: 'dark', label: 'Тёмная тема', icon: MoonIcon },
  { value: 'auto', label: 'Как в системе', icon: MonitorIcon },
]

export default function ThemeSwitch() {
  const [pref, setPref] = useTheme()
  return (
    <div className="theme-switch" role="radiogroup" aria-label="Тема оформления">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button key={value} type="button" role="radio" aria-checked={pref === value}
          className={pref === value ? 'is-on' : ''} onClick={() => setPref(value)}
          title={label} aria-label={label}>
          <Icon size={14} />
        </button>
      ))}
    </div>
  )
}
