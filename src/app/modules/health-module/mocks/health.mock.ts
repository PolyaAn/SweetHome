import { Health, HealthDictionary, HealthSection } from "../models/health.model";

export const HealthSectionsMock: HealthSection[] = [
  {
    id: 'mood',
    order: 1,
    name: 'Настроение',
    hide: false,
    type: 'rating',
    dictionary: true,
  },
  {
    id: 'activity',
    order: 2,
    name: 'Физическая активность',
    hide: false,
    type: 'type',
    dictionary: true,
  },
  {
    id: 'weight',
    order: 3,
    name: 'Вес',
    hide: false,
    type: 'number',
    defaultValue: '60',
    dictionary: false,
  },
  {
    id: 'blood-pressure',
    order: 4,
    name: 'АД',
    hide: false,
    type: 'big-number',
    defaultValue: '36,6',
    dictionary: false,
  },
  {
    id: 'blood-sugar',
    order: 5,
    name: 'Сахар',
    hide: false,
    type: 'number',
    defaultValue: '1,5',
    dictionary: false,
  },
  {
    id: 'water',
    order: 6,
    name: 'Вода',
    hide: false,
    type: 'number',
    defaultValue: '1,5',
    dictionary: false,
  },
  {
    id: 'temperature',
    order: 7,
    name: 'Температура',
    hide: false,
    type: 'number',
    defaultValue: '36,6',
    dictionary: false,
  },
  {
    id: 'other',
    order: 8,
    name: 'Другое',
    hide: false,
    type: 'type',
    dictionary: true,
  },
  {
    id: 'symptoms',
    order: 9,
    name: 'Симптомы',
    hide: false,
    type: 'type',
    dictionary: true,
  },
  {
    id: 'digestion',
    order: 10,
    name: 'Пищеворение',
    hide: false,
    type: 'type',
    dictionary: true,
  },
  {
    id: 'sex',
    order: 11,
    name: 'Секс',
    hide: false,
    type: 'type',
    dictionary: true,
  },
  {
    id: 'monthlies',
    order: 12,
    name: 'Женский цикл',
    hide: false,
    type: 'day-boolean',
    dictionary: false,
  },
];

export const HealthMock: Health = {
  data: '01.04.2026',
  healthDictionary: HealthDictionary,
  weight?: string;
  bloodPressure?: string;
  water?: string;
  temperature?: string;
  monthlies?: boolean;
};

export const HealthDictionaryMock: HealthDictionary[] = [
  {
    id: 'calm',
    name: 'Спокойствие',
    healthSection: 'mood',
    value: false,

  },
  {
    id: 'joy',
    name: 'Радость',
    healthSection: 'mood',
    value: false,
  },
  {
    id: 'high-energy',
    name: 'Много энергии',
    healthSection: 'mood',
    value: false,
  },
  {
    id: 'playfulness',
    name: 'Игривость',
    healthSection: 'mood',
    value: false,
  },
  {
    id: 'mood-swings',
    name: 'Перепады настроения',
    healthSection: 'mood',
    value: false,
  },
  {
    id: 'irritation',
    name: 'Раздражение',
    healthSection: 'mood',
    value: false,
  },
  {
    id: 'sadness',
    name: 'Грусть',
    healthSection: 'mood',
    value: false,
  },
  {
    id: 'anxiety',
    name: 'Тревога',
    healthSection: 'mood',
    value: false,
  },
  {
    id: 'depression',
    name: 'Подавленность',
    healthSection: 'mood',
    value: false,
  },
  {
    id: 'guilt',
    name: 'Чувство вины',
    healthSection: 'mood',
    value: false,
  },
  {
    id: 'obsessive-thoughts',
    name: 'Навязчивые мысли',
    healthSection: 'mood',
    value: false,
  },
  {
    id: 'low-energy',
    name: 'Мало энергии',
    healthSection: 'mood',
    value: false,
  },
  {
    id: 'apathy',
    name: 'Апатия',
    healthSection: 'mood',
    value: false,
  },
  {
    id: 'confusion',
    name: 'Растерянность',
    healthSection: 'mood',
    value: false,
  },
  {
    id: 'self-criticism',
    name: 'Жесткая самокритика',
    healthSection: 'mood',
    value: false,
  },
  {
    id: 'mood',
    name: 'Радость',
    healthSection: 'mood',
    value: false,
  },
];
