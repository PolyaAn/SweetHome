import { HealthDictionaryMock } from "../mocks/health.mock";

export interface HealthSection {
  id: string;
  order: number;
  name: string;
  defaultValue?: string;
  hide: boolean;
  type: HealthSectionType;
  dictionary: boolean;
}

export type HealthSectionType = 'rating' | 'type' | 'number' | 'big-number' | 'day-boolean';

export interface HealthDictionary {
  id: string;
  name: string;
  healthSection: string;
  value: boolean;
}

export interface Health {
  data: string;
  healthDictionary: HealthDictionary;
  weight?: string;
  bloodPressure?: string;
  water?: string;
  temperature?: string;
  monthlies?: boolean;
}
