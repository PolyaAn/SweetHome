export type MovieContentType = 'MOVIE' | 'CARTOON' | 'SERIES';
export type MovieSortBy = 'TITLE' | 'RATING' | 'CREATED_AT' | 'UPDATED_AT';
export type SortDirection = 'ASC' | 'DESC';

export interface MovieListItemVm {
  movieId: string;
  title: string;
  contentType: MovieContentType;
  rating?: number | null;
  genres: string[];
  country?: string | null;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MovieDetailsVm extends MovieListItemVm {
  originalTitle?: string | null;
  releaseYear?: number | null;
}

export interface MovieUpsertRequest {
  title: string;
  contentType: MovieContentType;
  rating?: number | null;
  genres: string[];
  country?: string | null;
  comment?: string | null;
}

export interface MovieSearchFilter {
  query?: string | null;
  contentTypes?: MovieContentType[];
  genres?: string[];
  countries?: string[];
  ratingFrom?: number | null;
  ratingTo?: number | null;
  page?: number;
  pageSize?: number;
  sortBy?: MovieSortBy;
  sortDirection?: SortDirection;
}

export interface MovieListResponse {
  items: MovieListItemVm[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
}

export interface MovieContentTypeDictionaryItem {
  code: MovieContentType;
  name: string;
}

export interface MovieDictionariesResponse {
  contentTypes: MovieContentTypeDictionaryItem[];
  genres: string[];
  countries: string[];
}

export interface MovieCreateResponse {
  movieId: string;
}

export interface MovieUpdateResponse {
  movieId: string;
  updatedAt: string;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  errorCode: string;
  message: string;
  details?: ApiFieldError[];
  traceId?: string;
}
