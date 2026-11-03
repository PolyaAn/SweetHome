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

export function wornLabel(lastWornAt: string | null | undefined, wearCount: number): string {
  if (!lastWornAt || !wearCount) {
    return 'Ещё не надевали';
  }

  const days: number = Math.floor((Date.now() - new Date(lastWornAt).getTime()) / 86_400_000);
  const times: string = `${wearCount} ${pluralize(wearCount, 'раз', 'раза', 'раз')}`;
  if (days <= 0) {
    return `Надевали сегодня · ${times}`;
  }
  if (days === 1) {
    return `Надевали вчера · ${times}`;
  }

  return `Надевали ${days} ${pluralize(days, 'день', 'дня', 'дней')} назад · ${times}`;
}

/** Типичная температура для текущего сезона — стартовое значение в подборе. */
export function defaultTemperature(date: Date = new Date()): number {
  const month: number = date.getMonth() + 1;
  if (month === 12 || month <= 2) {
    return -5;
  }
  if (month <= 5) {
    return 12;
  }
  if (month <= 8) {
    return 24;
  }

  return 8;
}
