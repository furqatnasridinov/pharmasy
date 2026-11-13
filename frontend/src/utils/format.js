/** Единственное место, где форматируется валюта. */
export function formatPrice(value) {
  const number = Number(value || 0)
  const hasFraction = Math.round(number * 100) % 100 !== 0
  const text = number.toLocaleString('ru-RU', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })
  return `${text.replace(/ /g, ' ')} смн`
}

/** Сервер хранит время в UTC без пояса — явно помечаем его, чтобы браузер показал местное время. */
export function parseDate(value) {
  if (typeof value === 'string' && /T\d{2}:\d{2}/.test(value) && !/(Z|[+-]\d{2}:?\d{2})$/.test(value)) {
    return new Date(`${value}Z`)
  }
  return new Date(value)
}

export function formatDate(value, withTime = false) {
  if (!value) return ''
  const date = parseDate(value)
  const opts = { day: 'numeric', month: 'long', year: 'numeric' }
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleString('ru-RU', opts)
}

export function formatShortDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** plural(5, ['препарат', 'препарата', 'препаратов']) → «препаратов» */
export function plural(n, forms) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1]
  return forms[2]
}

export const ORDER_STATUS = {
  new: { label: 'Новый', tone: 'blue' },
  accepted: { label: 'Принят', tone: 'teal' },
  ready: { label: 'Готов', tone: 'amber' },
  completed: { label: 'Выполнен', tone: 'green' },
  cancelled: { label: 'Отменён', tone: 'grey' },
}

export const STATUS_ACTIONS = {
  accepted: 'Принять заказ',
  ready: 'Заказ собран',
  completed: 'Выдан покупателю',
  cancelled: 'Отменить',
}

export const DELIVERY_LABEL = { pickup: 'Самовывоз', delivery: 'Доставка' }

export function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Доброй ночи'
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}
