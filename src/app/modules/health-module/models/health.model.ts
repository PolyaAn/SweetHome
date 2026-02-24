
export interface HealthSection {
  id: string;
  alias: string;
  order: number;
  name: string;
  hide: boolean;
  type: HealthSectionType;
  dictionary: boolean;
  averageValue?: boolean;
}

export type HealthSectionType = 'rating' | 'type' | 'number' | 'big-number' | 'day-boolean';

export interface HealthDictionary {
  // id: string;
  id: string;
  name: string;
  healthSection: string;
  value: boolean;
}

export interface Health {
  date: string;
  healthDictionary: HealthDictionary[];
  weight?: string;
  bloodPressureTop?: string;
  bloodPressureBottom?: string;
  bloodSugar?: string;
  water?: string;
  temperature?: string;
  monthlies?: boolean;
}

export interface HealthApi {
  health: Health;
  healthSections: HealthSection[];
}
