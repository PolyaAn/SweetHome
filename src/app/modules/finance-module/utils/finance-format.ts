const MONTHS: string[] = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_GENITIVE_SHORT: string[] = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_PREPOSITIONAL: string[] = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];

/** Локальная дата устройства в формате yyyy-MM-dd (не UTC: покупка вечером не должна «уезжать» на завтра). */
export function localIsoDate(date: Date = new Date()): string {
  const month: string = String(date.getMonth() + 1).padStart(2, '0');
  const day: string = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function currentMonth(date: Date = new Date()): string {
  return localIsoDate(date).slice(0, 7);
}

/** Месяц из адреса: формат yyyy-MM, не раньше 2000 года и не позже текущего (будущих расходов нет). */
export function isValidMonth(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return false;
  }
  return Number(value.slice(0, 4)) >= 2000 && value <= currentMonth();
}

/** Последняя допустимая дата покупки: завтра по часам устройства (на сервере — завтра по UTC). */
export function maxPurchaseDate(): string {
  const date: Date = new Date();
  date.setDate(date.getDate() + 1);
  return localIsoDate(date);
}

export function isValidPurchaseDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '2000-01-01' && value <= maxPurchaseDate();
}

export function shiftMonth(month: string, delta: number): string {
  const year: number = Number(month.slice(0, 4));
  const index: number = Number(month.slice(5, 7)) - 1 + delta;
  const date: Date = new Date(year, index, 1);
  return currentMonth(date);
}

export function monthTitle(month: string): string {
  const year: number = Number(month.slice(0, 4));
  const name: string = MONTHS[Number(month.slice(5, 7)) - 1];
  return year === new Date().getFullYear() ? name : `${name} ${year}`;
}

export function monthPrepositional(month: string): string {
  return MONTHS_PREPOSITIONAL[Number(month.slice(5, 7)) - 1];
}

/** «14 ноя», для другого года — «14 ноя 2025». */
export function shortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const label: string = `${day} ${MONTHS_GENITIVE_SHORT[month - 1]}`;
  return year === new Date().getFullYear() ? label : `${label} ${year}`;
}

/** 45320 → «45 320 ₽», 99.9 → «99,90 ₽». Копейки показываем, только если они есть. */
export function formatMoney(amount: number | null | undefined, currency: string = 'RUB'): string {
  const value: number = amount ?? 0;
  const hasKopecks: boolean = Math.round(Math.abs(value) * 100) % 100 !== 0;
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      minimumFractionDigits: hasKopecks ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(hasKopecks ? 2 : 0)} ${currency}`;
  }
}

/** Число для поля ввода: 1234.5 → «1234,50», целое — без копеек. */
export function moneyInput(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '';
  }
  const fixed: string = Math.round(Math.abs(amount) * 100) % 100 === 0 ? amount.toFixed(0) : amount.toFixed(2);
  return fixed.replace('.', ',');
}

/** Разбирает ввод суммы: пробелы, запятая или точка; null — если это не число. */
export function parseMoney(text: string | null | undefined): number | null {
  if (text === null || text === undefined) {
    return null;
  }
  // Минус может прийти как «−» (U+2212) или тире — при вставке из заметок или с клавиатуры iOS.
  const normalized: string = String(text)
    .replace(/[\s\u00a0\u202f₽]/g, '')
    .replace(/^[\u2212\u2012\u2013\u2014]/, '-')
    .replace(',', '.');
  if (!/^-?\d+(\.\d{0,2})?$/.test(normalized)) {
    return null;
  }
  const value: number = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Количество: до трёх знаков после запятой. */
export function parseQuantity(text: string | null | undefined): number | null {
  if (text === null || text === undefined) {
    return null;
  }
  const normalized: string = String(text).replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{0,3})?$/.test(normalized)) {
    return null;
  }
  const value: number = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function pluralize(count: number, one: string, few: string, many: string): string {
  const mod10: number = Math.abs(count) % 10;
  const mod100: number = Math.abs(count) % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }
  return many;
}
