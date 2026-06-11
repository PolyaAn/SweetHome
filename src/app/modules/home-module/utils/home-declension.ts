export type RussianPluralForms = readonly [string, string, string];

export const ROOM_FORMS: RussianPluralForms = ['комната', 'комнаты', 'комнат'];
export const DEVICE_FORMS: RussianPluralForms = ['устройство', 'устройства', 'устройств'];
export const SENSOR_FORMS: RussianPluralForms = ['датчик', 'датчика', 'датчиков'];
export const SCENARIO_FORMS: RussianPluralForms = ['сценарий', 'сценария', 'сценариев'];
export const RULE_FORMS: RussianPluralForms = ['правило', 'правила', 'правил'];
export const EVENT_FORMS: RussianPluralForms = ['событие', 'события', 'событий'];

export function pluralRu(count: number, forms: RussianPluralForms): string {
  const absolute = Math.abs(count);
  const lastTwo = absolute % 100;
  const last = absolute % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return forms[2];
  }

  if (last === 1) {
    return forms[0];
  }

  if (last >= 2 && last <= 4) {
    return forms[1];
  }

  return forms[2];
}

export function countText(count: number, forms: RussianPluralForms): string {
  return `${count} ${pluralRu(count, forms)}`;
}
