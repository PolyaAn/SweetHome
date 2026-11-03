import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, Subject, takeUntil } from 'rxjs';
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
import { pluralize, wornLabel } from './utils/wardrobe-format';

type WardrobeTab = 'items' | 'outfits';

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
  private itemsRequestId: number = 0;

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
    this.api.getDictionaries()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((dictionaries: WardrobeDictionaries) => {
        this.dictionaries = dictionaries;
        this.cdr.markForCheck();
      });

    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.unsubscribe$))
      .subscribe(() => this.loadItems());

    this.route.queryParams
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((params: Params) => {
        this.tab = params['tab'] === 'outfits' ? 'outfits' : 'items';
        if (this.tab === 'outfits' && !this.outfitsLoaded) {
          this.loadOutfits();
        }
        this.cdr.markForCheck();
      });

    this.loadItems();
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
        },
        error: () => {
          this.outfitsError = 'Не удалось загрузить образы';
        },
      });
  }

  addItem(): void {
    this.router.navigate(['/wardrobe/items/create']);
  }

  openItem(item: WardrobeItem): void {
    this.router.navigate(['/wardrobe/items', item.id, 'edit']);
  }

  openPicker(): void {
    this.router.navigate(['/wardrobe/outfits/suggest']);
  }

  toggleFavorite(event: Event, item: WardrobeItem): void {
    event.stopPropagation();
    const next: boolean = !item.isFavorite;
    const payload: WardrobeItemUpsertRequest = {
      name: item.name,
      category: item.category,
      colors: item.colors,
      seasons: item.seasons,
      styles: item.styles,
      warmth: item.warmth,
      brand: item.brand ?? null,
      notes: item.notes ?? null,
      isFavorite: next,
    };

    this.replaceItem({...item, isFavorite: next});
    this.api.updateItem(item.id, payload)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (updated: WardrobeItem) => {
          if (this.onlyFavorites && !updated.isFavorite) {
            this.items = this.items.filter((x: WardrobeItem) => x.id !== updated.id);
            this.cdr.markForCheck();
            return;
          }
          this.replaceItem(updated);
        },
        error: () => {
          this.replaceItem(item);
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
    const parts: string[] = [this.styleName(outfit.occasion)];
    if (outfit.temperature !== null && outfit.temperature !== undefined) {
      parts.push(`${outfit.temperature > 0 ? '+' : ''}${outfit.temperature}°C`);
    }
    parts.push(wornLabel(outfit.lastWornAt, outfit.wearCount));
    return parts.join(' · ');
  }

  trackById(_: number, entity: { id: string }): string {
    return entity.id;
  }

  private replaceItem(item: WardrobeItem): void {
    this.items = this.items.map((x: WardrobeItem) => x.id === item.id ? item : x);
    this.cdr.markForCheck();
  }
}
