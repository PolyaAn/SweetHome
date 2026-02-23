
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
}
