export type WardrobeCategory = 'TOP' | 'BOTTOM' | 'DRESS' | 'OUTERWEAR' | 'SHOES' | 'ACCESSORY';
export type WardrobeSeason = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';
export type WardrobeStyle = 'CASUAL' | 'OFFICE' | 'FORMAL' | 'SPORT' | 'HOME';
/** NONE — фон не обрабатывали, PENDING — убираем фон, READY — готова версия без фона, FAILED — не получилось. */
export type WardrobeImageStatus = 'NONE' | 'PENDING' | 'READY' | 'FAILED';
export type WardrobeImageVariant = 'ORIGINAL' | 'PROCESSED';

export interface WardrobeDictionaryItem<T extends string = string> {
  code: T;
  name: string;
}

export interface WardrobeColor {
  code: string;
  name: string;
  hex: string;
  neutral: boolean;
}

export interface WardrobeWarmthLevel {
  level: number;
  name: string;
}

export interface WardrobeDictionaries {
  categories: WardrobeDictionaryItem<WardrobeCategory>[];
  seasons: WardrobeDictionaryItem<WardrobeSeason>[];
  styles: WardrobeDictionaryItem<WardrobeStyle>[];
  colors: WardrobeColor[];
  warmthLevels: WardrobeWarmthLevel[];
  /** Сервер убирает фон с фото автоматически. */
  backgroundRemoval?: boolean;
}

export interface WardrobeItem {
  id: string;
  name: string;
  category: WardrobeCategory;
  colors: string[];
  seasons: WardrobeSeason[];
  styles: WardrobeStyle[];
  warmth: number;
  brand?: string | null;
  notes?: string | null;
  isFavorite: boolean;
  hasImage: boolean;
  imageUpdatedAt?: string | null;
  imageStatus?: WardrobeImageStatus;
  imageVariant?: WardrobeImageVariant;
  wearCount: number;
  lastWornAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WardrobeItemListResponse {
  items: WardrobeItem[];
  total: number;
  counts: Partial<Record<WardrobeCategory, number>>;
}

export interface WardrobeItemFilter {
  query?: string;
  category?: WardrobeCategory | null;
  favorite?: boolean | null;
}

export interface WardrobeItemUpsertRequest {
  name: string;
  category: WardrobeCategory;
  colors: string[];
  seasons: WardrobeSeason[];
  styles: WardrobeStyle[];
  warmth: number;
  brand: string | null;
  notes: string | null;
  isFavorite: boolean;
}

export interface WardrobeClassification {
  category: WardrobeCategory | null;
  seasons: WardrobeSeason[];
  styles: WardrobeStyle[];
  warmth: number | null;
  colors: string[];
  confidence: number;
  matchedKeywords: string[];
}

export interface OutfitSuggestRequest {
  occasion: WardrobeStyle;
  temperature: number | null;
  count?: number;
  seed?: number;
}

export interface OutfitSuggestion {
  items: WardrobeItem[];
  score: number;
  reasons: string[];
}

export interface OutfitSuggestResponse {
  outfits: OutfitSuggestion[];
  targetWarmth: number;
  season: WardrobeSeason;
  temperature: number;
  temperatureAssumed: boolean;
  missing: string[];
}

export interface WardrobeOutfit {
  id: string;
  name: string;
  itemIds: string[];
  items: WardrobeItem[];
  occasion: WardrobeStyle;
  temperature?: number | null;
  note?: string | null;
  wearCount: number;
  lastWornAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WardrobeOutfitCreateRequest {
  name: string;
  itemIds: string[];
  occasion: WardrobeStyle;
  temperature: number | null;
  note?: string | null;
}

/** Черновик образа для конструктора (например, из подбора по кнопке «Изменить»). */
export interface WardrobeOutfitDraft {
  name: string;
  itemIds: string[];
  occasion: WardrobeStyle;
  temperature: number | null;
}

export interface WardrobeApiErrorResponse {
  errorCode: string;
  message: string;
  details?: { field: string; message: string }[];
  traceId?: string;
}

export const WARDROBE_CATEGORY_ICONS: Record<WardrobeCategory, string> = {
  TOP: 'dry_cleaning',
  BOTTOM: 'accessibility_new',
  DRESS: 'woman',
  OUTERWEAR: 'checkroom',
  SHOES: 'directions_walk',
  ACCESSORY: 'watch',
};

/** Запасные словари: интерфейс работает, даже если словари с сервера не загрузились. */
export const WARDROBE_FALLBACK_DICTIONARIES: WardrobeDictionaries = {
  categories: [
    { code: 'TOP', name: 'Верх' },
    { code: 'BOTTOM', name: 'Низ' },
    { code: 'DRESS', name: 'Платья и комбинезоны' },
    { code: 'OUTERWEAR', name: 'Верхняя одежда' },
    { code: 'SHOES', name: 'Обувь' },
    { code: 'ACCESSORY', name: 'Аксессуары' },
  ],
  seasons: [
    { code: 'SPRING', name: 'Весна' },
    { code: 'SUMMER', name: 'Лето' },
    { code: 'AUTUMN', name: 'Осень' },
    { code: 'WINTER', name: 'Зима' },
  ],
  styles: [
    { code: 'CASUAL', name: 'Повседневный' },
    { code: 'OFFICE', name: 'Офис' },
    { code: 'FORMAL', name: 'Торжественный' },
    { code: 'SPORT', name: 'Спорт' },
    { code: 'HOME', name: 'Дом' },
  ],
  colors: [
    { code: 'BLACK', name: 'Чёрный', hex: '#1A1A1A', neutral: true },
    { code: 'WHITE', name: 'Белый', hex: '#F5F5F2', neutral: true },
    { code: 'GRAY', name: 'Серый', hex: '#8C8C8C', neutral: true },
    { code: 'BEIGE', name: 'Бежевый', hex: '#D8C3A5', neutral: true },
    { code: 'BROWN', name: 'Коричневый', hex: '#6B4423', neutral: true },
    { code: 'NAVY', name: 'Тёмно-синий', hex: '#1F2A44', neutral: true },
    { code: 'BLUE', name: 'Синий', hex: '#2F6FD6', neutral: false },
    { code: 'LIGHT_BLUE', name: 'Голубой', hex: '#9CC7F0', neutral: false },
    { code: 'RED', name: 'Красный', hex: '#C62828', neutral: false },
    { code: 'BURGUNDY', name: 'Бордовый', hex: '#6D1A2B', neutral: false },
    { code: 'PINK', name: 'Розовый', hex: '#F2A7C3', neutral: false },
    { code: 'ORANGE', name: 'Оранжевый', hex: '#F08A24', neutral: false },
    { code: 'YELLOW', name: 'Жёлтый', hex: '#F2D13D', neutral: false },
    { code: 'GREEN', name: 'Зелёный', hex: '#3D8B4A', neutral: false },
    { code: 'OLIVE', name: 'Оливковый', hex: '#6B6B2E', neutral: false },
    { code: 'PURPLE', name: 'Фиолетовый', hex: '#7B4EA3', neutral: false },
    { code: 'MULTI', name: 'Принт / пёстрый', hex: '#B07CC6', neutral: false },
  ],
  warmthLevels: [
    { level: 1, name: 'Очень лёгкая' },
    { level: 2, name: 'Лёгкая' },
    { level: 3, name: 'Средняя' },
    { level: 4, name: 'Тёплая' },
    { level: 5, name: 'Очень тёплая' },
  ],
  backgroundRemoval: false,
};
