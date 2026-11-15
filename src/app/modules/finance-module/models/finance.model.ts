export type FinanceCategoryCode =
  | 'GROCERIES' | 'CAFE' | 'TRANSPORT' | 'CAR' | 'HOME' | 'HEALTH' | 'BEAUTY' | 'CLOTHES' | 'PETS'
  | 'ELECTRONICS' | 'ENTERTAINMENT' | 'SERVICES' | 'UTILITIES' | 'TRAVEL' | 'GIFTS' | 'EDUCATION' | 'OTHER';

export type FinanceReceiptStatus = 'PENDING' | 'READY' | 'FAILED';
export type FinanceReceiptSource = 'PHOTO' | 'MANUAL';
export type FinanceFailureReason = 'NOT_A_RECEIPT' | 'UNREADABLE' | 'PROVIDER_ERROR' | 'DISABLED';
export type FinanceCategorySource = 'AI' | 'RULE' | 'USER';

export interface FinanceCategory {
  code: FinanceCategoryCode;
  name: string;
  icon: string;
  color: string;
}

export interface FinanceDictionaries {
  categories: FinanceCategory[];
  recognition: boolean;
}

export interface FinanceReceiptItem {
  id: string;
  name: string;
  quantity: number | null;
  price: number | null;
  amount: number;
  category: FinanceCategoryCode;
  categorySource: FinanceCategorySource;
}

export interface FinanceReceipt {
  id: string;
  source: FinanceReceiptSource;
  status: FinanceReceiptStatus;
  failureReason: FinanceFailureReason | null;
  purchasedOn: string;
  store: string | null;
  total: number;
  currency: string;
  category: FinanceCategoryCode;
  note: string | null;
  hasImage: boolean;
  itemCount: number;
  itemsTotal: number;
  categoryAmount: number | null;
  topCategories: FinanceCategoryCode[];
  items: FinanceReceiptItem[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceReceiptList {
  month: string;
  receipts: FinanceReceipt[];
}

export interface FinanceCategoryAmount {
  category: FinanceCategoryCode;
  amount: number;
  receiptCount: number;
}

export interface FinanceSummary {
  month: string;
  total: number;
  receiptCount: number;
  pendingCount: number;
  failedCount: number;
  otherCurrencyCount: number;
  previousTotal: number;
  categories: FinanceCategoryAmount[];
}

export interface FinanceManualReceiptRequest {
  total: number;
  category: FinanceCategoryCode;
  purchasedOn: string;
  store: string | null;
  note: string | null;
}

export interface FinanceReceiptItemUpdate {
  id: string | null;
  name: string;
  quantity: number | null;
  price: number | null;
  amount: number;
  category: FinanceCategoryCode;
}

export interface FinanceReceiptUpdateRequest {
  purchasedOn: string;
  store: string | null;
  total: number;
  currency: string;
  category: FinanceCategoryCode;
  note: string | null;
  items: FinanceReceiptItemUpdate[];
}

/** Запасной словарь на случай, если словари не загрузились: интерфейс не должен падать. */
export const FINANCE_FALLBACK_DICTIONARIES: FinanceDictionaries = {
  recognition: false,
  categories: [
    {code: 'GROCERIES', name: 'Продукты', icon: 'shopping_basket', color: '#4CAF50'},
    {code: 'CAFE', name: 'Кафе и рестораны', icon: 'restaurant', color: '#FF7043'},
    {code: 'TRANSPORT', name: 'Транспорт', icon: 'directions_bus', color: '#29B6F6'},
    {code: 'CAR', name: 'Автомобиль', icon: 'directions_car', color: '#5C6BC0'},
    {code: 'HOME', name: 'Дом и хозтовары', icon: 'chair', color: '#8D6E63'},
    {code: 'HEALTH', name: 'Здоровье', icon: 'medication', color: '#EF5350'},
    {code: 'BEAUTY', name: 'Красота и гигиена', icon: 'spa', color: '#EC407A'},
    {code: 'CLOTHES', name: 'Одежда и обувь', icon: 'checkroom', color: '#AB47BC'},
    {code: 'PETS', name: 'Питомцы', icon: 'pets', color: '#FFA726'},
    {code: 'ELECTRONICS', name: 'Техника', icon: 'devices', color: '#26A69A'},
    {code: 'ENTERTAINMENT', name: 'Развлечения', icon: 'theaters', color: '#7E57C2'},
    {code: 'SERVICES', name: 'Связь и подписки', icon: 'wifi', color: '#42A5F5'},
    {code: 'UTILITIES', name: 'ЖКХ', icon: 'bolt', color: '#FFCA28'},
    {code: 'TRAVEL', name: 'Путешествия', icon: 'flight', color: '#26C6DA'},
    {code: 'GIFTS', name: 'Подарки', icon: 'redeem', color: '#F06292'},
    {code: 'EDUCATION', name: 'Обучение', icon: 'school', color: '#66BB6A'},
    {code: 'OTHER', name: 'Другое', icon: 'more_horiz', color: '#90A4AE'},
  ],
};

export const FINANCE_FAILURE_TEXT: Record<FinanceFailureReason, string> = {
  NOT_A_RECEIPT: 'На фото не нашли чек',
  UNREADABLE: 'Не удалось прочитать сумму',
  PROVIDER_ERROR: 'Сервис распознавания не ответил',
  DISABLED: 'Распознавание выключено на сервере',
};
