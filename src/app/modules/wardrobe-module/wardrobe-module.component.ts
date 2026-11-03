import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { catchError, debounceTime, exhaustMap, finalize, forkJoin, of, Subject, switchMap, takeUntil, takeWhile, timer } from 'rxjs';
import { BaseComponent } from '../../components/base/base.component';
import { ToastService } from '../../shared/services/toast.service';
import {
  WARDROBE_FALLBACK_DICTIONARIES,
  WardrobeCategory,
  WardrobeColor,
  WardrobeDictionaries,
  WardrobeDictionaryItem,
  WardrobeItem,
  WardrobeItemListResponse,
  WardrobeItemUpsertRequest,
  WardrobeOutfit,
  WardrobeStyle,
} from './models/wardrobe.model';
import { WardrobeApiService } from './services/wardrobe-api.service';
import { WardrobeImageService } from './services/wardrobe-image.service';
import { WardrobeStateService } from './services/wardrobe-state.service';
import { pluralize, wornLabel } from './utils/wardrobe-format';

type WardrobeTab = 'items' | 'outfits';

const PENDING_POLL_LIMIT_MS = 2 * 60 * 1000;

@Component({
  selector: 'app-wardrobe-module',
  templateUrl: './wardrobe-module.component.html',
  styleUrl: './wardrobe-module.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WardrobeModuleComponent extends BaseComponent implements OnInit {
  constructor(
    private api: WardrobeApiService,
    private images: WardrobeImageService,
    private state: WardrobeStateService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {
    super();
  }

  tab: WardrobeTab = 'items';
  dictionaries: WardrobeDictionaries = WARDROBE_FALLBACK_DICTIONARIES;

  items: WardrobeItem[] = [];
  counts: Partial<Record<WardrobeCategory, number>> = {};
  searchQuery: string = '';
  category: WardrobeCategory | null = null;
  onlyFavorites: boolean = false;
  itemsLoading: boolean = true;
  itemsError: string = '';

  outfits: WardrobeOutfit[] = [];
  outfitsLoading: boolean = false;
  outfitsLoaded: boolean = false;
  outfitsError: string = '';
  busyOutfitId: string | null = null;

  private readonly search$: Subject<string> = new Subject<string>();
  /** Перезапуск опроса вещей, у которых сервер ещё убирает фон. */
  private readonly pendingPoll$: Subject<void> = new Subject<void>();
  private itemsRequestId: number = 0;
  /** Строка поиска, с которой загружен текущий список (вместо distinctUntilChanged, который ломался после сброса). */
  private loadedQuery: string = '';
  /** Избранное: желаемое значение и запрос в полёте по каждой вещи — запросы идут строго по очереди. */
  private readonly favoriteDesired: Map<string, boolean> = new Map();
  private readonly favoriteInFlight: Set<string> = new Set();

  get totalItems(): number {
    return Object.values(this.counts).reduce((sum: number, value: number | undefined) => sum + (value || 0), 0);
  }

  get hasFilters(): boolean {
    return !!this.searchQuery.trim() || !!this.category || this.onlyFavorites;
  }

  get itemsSummary(): string {
    const total: number = this.totalItems;
    return `${total} ${pluralize(total, 'вещь', 'вещи', 'вещей')}`;
  }

  ngOnInit(): void {
    // Фильтры восстанавливаем после возврата со страницы вещи.
    this.searchQuery = this.state.list.searchQuery;
    this.category = this.state.list.category;
    this.onlyFavorites = this.state.list.onlyFavorites;

    this.api.getDictionaries()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((dictionaries: WardrobeDictionaries) => {
        this.dictionaries = dictionaries;
        this.cdr.markForCheck();
      });

    this.search$
      .pipe(debounceTime(300), takeUntil(this.unsubscribe$))
      .subscribe((query: string) => {
        if (query !== this.loadedQuery) {
          this.loadItems();
        }
      });

    // Пока у фото убирают фон, раз в 3 секунды спрашиваем только эти вещи (не дольше 2 минут).
    this.pendingPoll$
      .pipe(
        switchMap(() => {
          const startedAt: number = Date.now();
          return timer(3000, 3000).pipe(
            takeWhile(() => this.pendingImageIds().length > 0 && Date.now() - startedAt < PENDING_POLL_LIMIT_MS),
            exhaustMap(() => forkJoin(this.pendingImageIds().map((id: string) => this.api.getItem(id).pipe(
              catchError(() => of(null)),
            )))),
          );
        }),
        takeUntil(this.unsubscribe$),
      )
      .subscribe((updated: (WardrobeItem | null)[]) => {
        updated.forEach((item: WardrobeItem | null) => item && this.applyImageState(item));
      });

    this.route.queryParams
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((params: Params) => {
        this.tab = params['tab'] === 'outfits' ? 'outfits' : 'items';
        if (this.tab === 'outfits' && !this.outfitsLoaded && !this.outfitsLoading) {
          this.loadOutfits();
        }
        this.cdr.markForCheck();
      });

    this.loadItems();
    // Образы грузим сразу, чтобы счётчик на вкладке был виден до её открытия.
    if (!this.outfitsLoaded && !this.outfitsLoading) {
      this.loadOutfits();
    }
  }

  setTab(tab: WardrobeTab): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {tab: tab === 'items' ? null : tab},
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onSearch(value: string): void {
    this.searchQuery = value;
    this.search$.next(value.trim());
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.search$.next('');
  }

  selectCategory(category: WardrobeCategory | null): void {
    this.category = this.category === category ? null : category;
    this.loadItems();
  }

  toggleFavoritesFilter(): void {
    this.onlyFavorites = !this.onlyFavorites;
    this.loadItems();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.category = null;
    this.onlyFavorites = false;
    this.loadItems();
  }

  loadItems(): void {
    const requestId: number = ++this.itemsRequestId;
    this.loadedQuery = this.searchQuery.trim();
    this.state.list = {searchQuery: this.searchQuery, category: this.category, onlyFavorites: this.onlyFavorites};
    this.itemsLoading = true;
    this.itemsError = '';
    this.cdr.markForCheck();

    this.api.getItems({
      query: this.searchQuery,
      category: this.category,
      favorite: this.onlyFavorites ? true : null,
    })
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (response: WardrobeItemListResponse) => {
          if (requestId !== this.itemsRequestId) {
            return;
          }
          this.items = response.items;
          this.counts = response.counts || {};
          this.itemsLoading = false;
          this.restartPendingPoll();
          this.cdr.markForCheck();
        },
        error: () => {
          if (requestId !== this.itemsRequestId) {
            return;
          }
          this.itemsError = 'Не удалось загрузить гардероб';
          this.itemsLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  loadOutfits(): void {
    this.outfitsLoading = true;
    this.outfitsError = '';
    this.cdr.markForCheck();

    this.api.getOutfits()
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.outfitsLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (outfits: WardrobeOutfit[]) => {
          this.outfits = outfits;
          this.outfitsLoaded = true;
          this.restartPendingPoll();
        },
        error: () => {
          this.outfitsError = 'Не удалось загрузить образы';
        },
      });
  }

  addItem(): void {
    this.router.navigate(['/wardrobe/items/create']);
  }

  onCardKey(event: Event, item: WardrobeItem): void {
    if (event.target !== event.currentTarget) {
      return;
    }
    event.preventDefault();
    this.openItem(item);
  }

  openItem(item: WardrobeItem): void {
    this.router.navigate(['/wardrobe/items', item.id, 'edit']);
  }

  openPicker(): void {
    this.router.navigate(['/wardrobe/outfits/suggest']);
  }

  createOutfit(): void {
    this.router.navigate(['/wardrobe/outfits/create']);
  }

  editOutfit(outfit: WardrobeOutfit): void {
    this.router.navigate(['/wardrobe/outfits', outfit.id, 'edit']);
  }

  toggleFavorite(event: Event, item: WardrobeItem): void {
    event.stopPropagation();
    const next: boolean = !item.isFavorite;
    this.favoriteDesired.set(item.id, next);
    this.replaceItem({...item, isFavorite: next});

    // Пока предыдущий запрос не вернулся, новый не шлём: иначе ответы могут прийти не по порядку
    // и экран разойдётся с сервером. После ответа досылаем последнее желаемое значение.
    if (!this.favoriteInFlight.has(item.id)) {
      this.sendFavorite(item, next);
    }
  }

  private sendFavorite(item: WardrobeItem, value: boolean): void {
    const payload: WardrobeItemUpsertRequest = {
      name: item.name,
      category: item.category,
      colors: item.colors,
      seasons: item.seasons,
      styles: item.styles,
      warmth: item.warmth,
      brand: item.brand ?? null,
      notes: item.notes ?? null,
      isFavorite: value,
    };

    // Флаг «в полёте» снимаем явно в next/error (не в finalize): finalize срабатывает уже после
    // повторной отправки и снял бы флаг у следующего запроса.
    this.favoriteInFlight.add(item.id);
    this.api.updateItem(item.id, payload)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (updated: WardrobeItem) => {
          const desired: boolean | undefined = this.favoriteDesired.get(item.id);
          if (desired !== undefined && desired !== updated.isFavorite) {
            this.sendFavorite(updated, desired);
            return;
          }

          this.favoriteInFlight.delete(item.id);
          this.favoriteDesired.delete(item.id);
          if (this.onlyFavorites && !updated.isFavorite) {
            this.items = this.items.filter((x: WardrobeItem) => x.id !== updated.id);
            this.cdr.markForCheck();
            return;
          }
          this.replaceItem(updated);
        },
        error: () => {
          this.favoriteInFlight.delete(item.id);
          this.favoriteDesired.delete(item.id);
          this.replaceItem({...item, isFavorite: !value});
          this.toast.error('Не удалось обновить вещь');
        },
      });
  }

  wearOutfit(outfit: WardrobeOutfit): void {
    if (this.busyOutfitId) {
      return;
    }

    this.busyOutfitId = outfit.id;
    this.api.wearOutfit(outfit.id)
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.busyOutfitId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (updated: WardrobeOutfit) => {
          this.outfits = this.outfits.map((x: WardrobeOutfit) => x.id === updated.id ? updated : x);
          this.toast.success('Отмечено: образ надет сегодня');
          this.loadItems();
        },
        error: () => this.toast.error('Не удалось отметить образ'),
      });
  }

  deleteOutfit(outfit: WardrobeOutfit): void {
    if (this.busyOutfitId || !window.confirm(`Удалить образ «${outfit.name}»?`)) {
      return;
    }

    this.busyOutfitId = outfit.id;
    this.api.deleteOutfit(outfit.id)
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.busyOutfitId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.outfits = this.outfits.filter((x: WardrobeOutfit) => x.id !== outfit.id);
          this.toast.success('Образ удалён');
        },
        error: () => this.toast.error('Не удалось удалить образ'),
      });
  }

  categoryCount(category: WardrobeCategory): number {
    return this.counts[category] || 0;
  }

  categoryName(category: WardrobeCategory): string {
    return this.dictionaries.categories.find((x: WardrobeDictionaryItem) => x.code === category)?.name ?? category;
  }

  styleName(style: WardrobeStyle): string {
    return this.dictionaries.styles.find((x: WardrobeDictionaryItem) => x.code === style)?.name ?? style;
  }

  colorOf(code: string): WardrobeColor | undefined {
    return this.dictionaries.colors.find((x: WardrobeColor) => x.code === code);
  }

  outfitSubtitle(outfit: WardrobeOutfit): string {
    const parts: string[] = [];
    const style: string = this.styleName(outfit.occasion);
    if (!outfit.name.includes(style)) {
      parts.push(style);
    }
    if (outfit.temperature !== null && outfit.temperature !== undefined) {
      const temperature: string = `${outfit.temperature > 0 ? '+' : ''}${outfit.temperature}°C`;
      if (!outfit.name.includes(temperature)) {
        parts.push(temperature);
      }
    }
    parts.push(wornLabel(outfit.lastWornAt, outfit.wearCount));
    return parts.join(' · ');
  }

  trackById(_: number, entity: { id: string }): string {
    return entity.id;
  }

  private pendingImageIds(): string[] {
    const ids: Set<string> = new Set();
    this.items.forEach((item: WardrobeItem) => item.imageStatus === 'PENDING' && ids.add(item.id));
    this.outfits.forEach((outfit: WardrobeOutfit) => outfit.items
      .forEach((item: WardrobeItem) => item.imageStatus === 'PENDING' && ids.add(item.id)));
    return Array.from(ids);
  }

  private restartPendingPoll(): void {
    if (this.pendingImageIds().length) {
      this.pendingPoll$.next();
    }
  }

  /** Обновляет только поля фото: избранное и прочее могли поменять, пока шёл опрос. */
  private applyImageState(source: WardrobeItem): void {
    const patch = (item: WardrobeItem): WardrobeItem => item.id !== source.id ? item : {
      ...item,
      hasImage: source.hasImage,
      imageUpdatedAt: source.imageUpdatedAt,
      imageStatus: source.imageStatus,
      imageVariant: source.imageVariant,
    };
    this.items = this.items.map(patch);
    this.outfits = this.outfits.map((outfit: WardrobeOutfit) => outfit.items.some((x: WardrobeItem) => x.id === source.id)
      ? {...outfit, items: outfit.items.map(patch)}
      : outfit);
    this.cdr.markForCheck();
  }

  private replaceItem(item: WardrobeItem): void {
    this.items = this.items.map((x: WardrobeItem) => x.id === item.id ? item : x);
    this.cdr.markForCheck();
  }
}
