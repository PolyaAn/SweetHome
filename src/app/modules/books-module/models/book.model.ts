export type BookStatus = 'WANT_TO_READ' | 'READING' | 'COMPLETED' | 'ON_HOLD' | 'DROPPED';
export type BookSort = 'UPDATED_AT' | 'TITLE' | 'AUTHOR' | 'RATING';

export const BOOK_STATUSES: { code: BookStatus; name: string; icon: string }[] = [
  { code: 'WANT_TO_READ', name: 'Хочу прочитать', icon: 'bookmark_border' },
  { code: 'READING', name: 'Читаю', icon: 'auto_stories' },
  { code: 'COMPLETED', name: 'Прочитано', icon: 'task_alt' },
  { code: 'ON_HOLD', name: 'Отложено', icon: 'pause_circle_outline' },
  { code: 'DROPPED', name: 'Не дочитано', icon: 'stop_circle' },
];

export interface BookUpsert {
  title: string;
  author: string;
  genre: string | null;
  status: BookStatus;
  totalPages: number | null;
  pagesRead: number;
  rating: number | null;
  notes: string | null;
}

export interface Book extends BookUpsert {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookStats {
  total: number;
  wantToRead: number;
  reading: number;
  completed: number;
  onHold: number;
  dropped: number;
  pagesRead: number;
}

export interface BookList {
  items: Book[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  stats: BookStats;
}
