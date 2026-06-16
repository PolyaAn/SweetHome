import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs';
import { BaseComponent } from '../../components/base/base.component';
import { MovieViewMode, SharedService } from '../../shared/services/shared.service';
import {
  MovieContentType,
  MovieContentTypeDictionaryItem,
  MovieDictionariesResponse,
  MovieListItemVm,
  MovieListResponse,
  MovieSearchFilter,
  MovieSortBy,
  SortDirection,
} from './models/movie.model';
import { MovieModuleService } from './services/movie-module.service';
import { ToastService } from '../../shared/services/toast.service';

type MovieFiltersState = {
  contentTypes: MovieContentType[];
  genres: string[];
  countries: string[];
  ratingFrom: string;
  ratingTo: string;
  sortBy: MovieSortBy;
  sortDirection: SortDirection;
};

type MovieFiltersStorageState = MovieFiltersState;

type MovieFilterSection = 'contentType' | 'genres' | 'countries' | 'rating' | 'sort';

type RatingPreset = {
  label: string;
  from: number | null;
  to: number | null;
};

@Component({
  selector: 'app-movie-module',
  templateUrl: './movie-module.component.html',
  styleUrl: './movie-module.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovieModuleComponent extends BaseComponent implements OnInit {
  private readonly filtersStorageKey = 'movie-module.filters';
  private readonly search$ = new Subject<string>();
  private readonly pageSize = 20;
  private readonly ratingMin = 0;
  private readonly ratingMax = 10;
  private readonly defaultFilters: MovieFiltersState = {
    contentTypes: [],
    genres: [],
    countries: [],
    ratingFrom: '',
    ratingTo: '',
    sortBy: 'UPDATED_AT',
    sortDirection: 'DESC',
  };

  constructor(
    private ms: MovieModuleService,
    private cdr: ChangeDetectorRef,
    private ss: SharedService,
    private router: Router,
    private toastService: ToastService,
  ) {
    super();
  }

  movies: MovieListItemVm[] = [];
  dictionaries: MovieDictionariesResponse = {
    contentTypes: [
      { code: 'MOVIE', name: 'фильм' },
      { code: 'CARTOON', name: 'мультфильм' },
      { code: 'SERIES', name: 'сериал' },
      { code: 'ANIME', name: 'аниме' },
      { code: 'DORAMA', name: 'дорама' },
    ],
    genres: [],
    countries: [],
  };
  searchQuery: string = '';
  draftSearchQuery: string = '';
  filters: MovieFiltersState = {...this.defaultFilters};
  showFilters: boolean = false;
  expandedFilterSection: MovieFilterSection | null = null;
  listLoading: boolean = false;
  dictionariesLoading: boolean = false;
  loadingMore: boolean = false;
  errorMessage: string = '';
  currentPage: number = 1;
  total: number = 0;
  hasNext: boolean = false;
  viewMode: MovieViewMode = 'list';
  readonly ratingScaleMarks: number[] = [0, 2, 4, 6, 8, 10];
  readonly ratingPresets: RatingPreset[] = [
    { label: 'Любой', from: null, to: null },
    { label: '6+', from: 6, to: 10 },
    { label: '7+', from: 7, to: 10 },
    { label: '8+', from: 8, to: 10 },
    { label: '9+', from: 9, to: 10 },
  ];

  get isPhone(): boolean {
    return this.ss.isPhone;
  }

  get activeFiltersCount(): number {
    let count = 0;

    count += this.filters.contentTypes.length ? 1 : 0;
    count += this.filters.genres.length ? 1 : 0;
    count += this.filters.countries.length ? 1 : 0;
    count += this.filters.ratingFrom || this.filters.ratingTo ? 1 : 0;
    count += this.filters.sortBy !== this.defaultFilters.sortBy || this.filters.sortDirection !== this.defaultFilters.sortDirection ? 1 : 0;

    return count;
  }

  get selectedContentTypeLabel(): string {
    if (!this.filters.contentTypes.length) {
      return 'Любой';
    }

    if (this.filters.contentTypes.length === 1) {
      return this.getTypeLabel(this.filters.contentTypes[0]);
    }

    return `${this.filters.contentTypes.length} выбрано`;
  }

  get genresSummary(): string {
    return this.getSelectionSummary(this.filters.genres.length);
  }

  get countriesSummary(): string {
    return this.getSelectionSummary(this.filters.countries.length);
  }

  get ratingSummary(): string {
    const from: number | null = this.getRatingBound(this.filters.ratingFrom);
    const to: number | null = this.getRatingBound(this.filters.ratingTo);

    if (from === null && to === null) {
      return 'Любой';
    }

    if (from !== null && to !== null) {
      return `${this.formatRatingValue(from)} - ${this.formatRatingValue(to)}`;
    }

    if (from !== null) {
      return `${this.formatRatingValue(from)}+`;
    }

    return `До ${this.formatRatingValue(to ?? this.ratingMax)}`;
  }

  get sortSummary(): string {
    return this.getSortLabel(this.filters.sortBy, this.filters.sortDirection);
  }

  get ratingFromValue(): number {
    return this.getRatingBound(this.filters.ratingFrom) ?? this.ratingMin;
  }

  get ratingToValue(): number {
    return this.getRatingBound(this.filters.ratingTo) ?? this.ratingMax;
  }

  get ratingStartPercent(): number {
    return ((this.ratingFromValue - this.ratingMin) / (this.ratingMax - this.ratingMin)) * 100;
  }

  get ratingEndPercent(): number {
    return ((this.ratingToValue - this.ratingMin) / (this.ratingMax - this.ratingMin)) * 100;
  }

  ngOnInit(): void {
    this.restoreFilters();

    this.ss.movieViewMode$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (mode: MovieViewMode) => {
          this.viewMode = mode;
          this.cdr.markForCheck();
        },
      });

    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.unsubscribe$),
      )
      .subscribe({
        next: (query: string) => {
          this.searchQuery = query;
          this.loadMovies(true);
        },
      });

    this.loadDictionaries();
    this.loadMovies(true);
  }

  onSearchInput(value: string): void {
    this.draftSearchQuery = value;
    this.search$.next(value.trim());
  }

  clearSearch(): void {
    this.draftSearchQuery = '';
    this.search$.next('');
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  toggleContentType(type: MovieContentType): void {
    this.filters.contentTypes = this.toggleItem(this.filters.contentTypes, type);
    this.persistFilters();
  }

  toggleGenre(genre: string): void {
    this.filters.genres = this.toggleItem(this.filters.genres, genre);
    this.persistFilters();
  }

  toggleCountry(country: string): void {
    this.filters.countries = this.toggleItem(this.filters.countries, country);
    this.persistFilters();
  }

  updateRatingFrom(value: string): void {
    const nextFrom: number = this.clampRating(Number(value), this.ratingMin, this.ratingToValue);
    this.filters.ratingFrom = this.stringifyRating(nextFrom);
    this.persistFilters();
  }

  updateRatingTo(value: string): void {
    const nextTo: number = this.clampRating(Number(value), this.ratingFromValue, this.ratingMax);
    this.filters.ratingTo = this.stringifyRating(nextTo);
    this.persistFilters();
  }

  applyFilters(): void {
    this.loadMovies(true);
    if (this.isPhone) {
      this.showFilters = false;
    }
  }

  resetFilters(): void {
    this.filters = {...this.defaultFilters};
    this.expandedFilterSection = null;
    this.persistFilters();
    this.loadMovies(true);
  }

  updateSort(sortBy: MovieSortBy, sortDirection: SortDirection): void {
    this.filters.sortBy = sortBy;
    this.filters.sortDirection = sortDirection;
    this.persistFilters();
  }

  toggleFilterSection(section: MovieFilterSection): void {
    this.expandedFilterSection = this.expandedFilterSection === section ? null : section;
  }

  isFilterSectionExpanded(section: MovieFilterSection): boolean {
    return this.expandedFilterSection === section;
  }

  applyRatingPreset(from: number | null, to: number | null): void {
    this.filters.ratingFrom = from === null ? '' : this.stringifyRating(from);
    this.filters.ratingTo = to === null ? '' : this.stringifyRating(to);
    this.persistFilters();
  }

  isRatingPresetActive(from: number | null, to: number | null): boolean {
    return this.filters.ratingFrom === (from === null ? '' : this.stringifyRating(from))
      && this.filters.ratingTo === (to === null ? '' : this.stringifyRating(to));
  }

  openMovie(movieId: string): void {
    this.router.navigate(['/movies', movieId, 'edit']);
  }

  addMovie(): void {
    this.router.navigate(['/movies/create']);
  }

  retry(): void {
    this.loadMovies(true);
  }

  loadMore(): void {
    if (!this.hasNext || this.loadingMore || this.listLoading) {
      return;
    }

    this.currentPage += 1;
    this.loadMovies(false);
  }

  getTypeLabel(contentType: MovieContentType): string {
    return this.dictionaries.contentTypes.find((item: MovieContentTypeDictionaryItem) => item.code === contentType)?.name || contentType;
  }

  trackByMovieId(_: number, movie: MovieListItemVm): string {
    return movie.movieId;
  }

  private loadDictionaries(): void {
    this.dictionariesLoading = true;
    this.ms.getDictionaries()
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.dictionariesLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (dictionaries: MovieDictionariesResponse) => {
          this.dictionaries = dictionaries;
          this.cdr.markForCheck();
        },
        error: () => {
          this.toastService.error('Не удалось загрузить справочники кино');
        },
      });
  }

  private loadMovies(reset: boolean): void {
    if (reset) {
      this.currentPage = 1;
      this.movies = [];
      this.errorMessage = '';
      this.listLoading = true;
    } else {
      this.loadingMore = true;
    }

    this.ms.getMovies(this.buildFilter())
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.listLoading = false;
          this.loadingMore = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response: MovieListResponse) => {
          this.total = response.total;
          this.hasNext = response.hasNext;
          this.movies = reset ? response.items : [...this.movies, ...response.items];
        },
        error: () => {
          this.errorMessage = 'Не удалось загрузить список фильмов';
          if (!reset) {
            this.currentPage = Math.max(1, this.currentPage - 1);
          }
        },
      });
  }

  private buildFilter(): MovieSearchFilter {
    const ratingFrom: number | null = this.filters.ratingFrom === '' ? null : Number(this.filters.ratingFrom);
    const ratingTo: number | null = this.filters.ratingTo === '' ? null : Number(this.filters.ratingTo);

    return {
      query: this.searchQuery || null,
      contentTypes: this.filters.contentTypes,
      genres: this.filters.genres,
      countries: this.filters.countries,
      ratingFrom: Number.isFinite(ratingFrom) ? ratingFrom : null,
      ratingTo: Number.isFinite(ratingTo) ? ratingTo : null,
      page: this.currentPage,
      pageSize: this.pageSize,
      sortBy: this.filters.sortBy,
      sortDirection: this.filters.sortDirection,
    };
  }

  private toggleItem<T>(items: T[], value: T): T[] {
    return items.includes(value)
      ? items.filter((item: T) => item !== value)
      : [...items, value];
  }

  private getSelectionSummary(count: number): string {
    if (!count) {
      return 'Любой';
    }

    if (count === 1) {
      return '1 выбрано';
    }

    return `${count} выбрано`;
  }

  private getSortLabel(sortBy: MovieSortBy, sortDirection: SortDirection): string {
    if (sortBy === 'TITLE' && sortDirection === 'ASC') {
      return 'По названию';
    }

    if (sortBy === 'RATING' && sortDirection === 'DESC') {
      return 'По рейтингу';
    }

    return 'Сначала новые';
  }

  private getRatingBound(value: string): number | null {
    if (value === '') {
      return null;
    }

    const parsed: number = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private clampRating(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
      return min;
    }

    return Math.min(max, Math.max(min, value));
  }

  private formatRatingValue(value: number): string {
    return value.toFixed(1);
  }

  private stringifyRating(value: number): string {
    return value.toFixed(1);
  }

  private restoreFilters(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const rawValue: string | null = window.localStorage.getItem(this.filtersStorageKey);
    if (!rawValue) {
      return;
    }

    try {
      const parsed: unknown = JSON.parse(rawValue);
      this.filters = this.sanitizeFilters(parsed);
    } catch {
      this.filters = {...this.defaultFilters};
      window.localStorage.removeItem(this.filtersStorageKey);
    }
  }

  private persistFilters(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(this.filtersStorageKey, JSON.stringify(this.filters));
  }

  private sanitizeFilters(value: unknown): MovieFiltersStorageState {
    if (!value || typeof value !== 'object') {
      return {...this.defaultFilters};
    }

    const source: Partial<MovieFiltersStorageState> = value as Partial<MovieFiltersStorageState>;
    const sortBy: MovieSortBy = this.isMovieSortBy(source.sortBy) ? source.sortBy : this.defaultFilters.sortBy;
    const sortDirection: SortDirection = this.isSortDirection(source.sortDirection) ? source.sortDirection : this.defaultFilters.sortDirection;
    const ratingFrom: string = this.normalizeStoredRating(source.ratingFrom);
    const ratingTo: string = this.normalizeStoredRating(source.ratingTo);
    const normalizedRange: { ratingFrom: string; ratingTo: string } = this.normalizeRatingRange(ratingFrom, ratingTo);

    return {
      contentTypes: Array.isArray(source.contentTypes)
        ? source.contentTypes.filter((item: unknown): item is MovieContentType => this.isMovieContentType(item))
        : [],
      genres: Array.isArray(source.genres)
        ? source.genres.filter((item: unknown): item is string => typeof item === 'string')
        : [],
      countries: Array.isArray(source.countries)
        ? source.countries.filter((item: unknown): item is string => typeof item === 'string')
        : [],
      ratingFrom: normalizedRange.ratingFrom,
      ratingTo: normalizedRange.ratingTo,
      sortBy,
      sortDirection,
    };
  }

  private normalizeStoredRating(value: unknown): string {
    if (typeof value !== 'string' || value === '') {
      return '';
    }

    const parsed: number = Number(value);
    if (!Number.isFinite(parsed)) {
      return '';
    }

    return this.stringifyRating(this.clampRating(parsed, this.ratingMin, this.ratingMax));
  }

  private normalizeRatingRange(ratingFrom: string, ratingTo: string): { ratingFrom: string; ratingTo: string } {
    const fromValue: number | null = this.getRatingBound(ratingFrom);
    const toValue: number | null = this.getRatingBound(ratingTo);

    if (fromValue === null || toValue === null || fromValue <= toValue) {
      return {ratingFrom, ratingTo};
    }

    return {
      ratingFrom: this.stringifyRating(toValue),
      ratingTo: this.stringifyRating(fromValue),
    };
  }

  private isMovieContentType(value: unknown): value is MovieContentType {
    return value === 'MOVIE'
      || value === 'CARTOON'
      || value === 'SERIES'
      || value === 'ANIME'
      || value === 'DORAMA';
  }

  private isMovieSortBy(value: unknown): value is MovieSortBy {
    return value === 'TITLE'
      || value === 'RATING'
      || value === 'CREATED_AT'
      || value === 'UPDATED_AT';
  }

  private isSortDirection(value: unknown): value is SortDirection {
    return value === 'ASC' || value === 'DESC';
  }
}
