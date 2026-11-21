import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';
import { Coin, CoinFields, CoinSave, CoinsApiService, PhotoChange, PhotoSide } from './coins-api.service';
import { prepareCoinPhoto } from './prepare-coin-photo';

type Scope = 'all' | 'missing' | 'duplicates';
type Sort = 'latest' | 'oldest' | 'newest' | 'name';
type View = 'grid' | 'list';
type Filters = { country: string; grade: string };
type PhotoDraft = { preview: string | null; change?: PhotoChange };

const pageSize = 48;
const viewPreference = 'sweethome-coins-view';
const collator = new Intl.Collator('ru');
const normalize = (value: string) => value.trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
const photoSides: { key: PhotoSide; label: string; zoomLabel: string }[] = [
  { key: 'obverse', label: 'Аверс', zoomLabel: 'Увеличить аверс' },
  { key: 'reverse', label: 'Реверс', zoomLabel: 'Увеличить реверс' },
];
const grades = [
  { code: 'G', label: 'Хорошая' },
  { code: 'VG', label: 'Очень хорошая' },
  { code: 'F', label: 'Прекрасная' },
  { code: 'VF', label: 'Очень прекрасная' },
  { code: 'XF', label: 'Отличная' },
  { code: 'AU', label: 'Почти превосходная' },
  { code: 'UNC', label: 'Без обращения' },
  { code: 'Proof', label: 'Пруф' },
];

@Component({
  selector: 'app-coins',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coins.component.html',
  styleUrl: './coins.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinsComponent implements OnInit {
  private readonly api = inject(CoinsApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly filterDialog = viewChild.required<ElementRef<HTMLDialogElement>>('filterDialog');
  private readonly detailsDialog = viewChild.required<ElementRef<HTMLDialogElement>>('detailsDialog');
  private readonly editorDialog = viewChild.required<ElementRef<HTMLDialogElement>>('editorDialog');
  private readonly confirmDialog = viewChild.required<ElementRef<HTMLDialogElement>>('confirmDialog');
  private readonly zoomDialog = viewChild.required<ElementRef<HTMLDialogElement>>('zoomDialog');
  private readonly addButton = viewChild.required<ElementRef<HTMLButtonElement>>('addButton');
  private readonly filterButton = viewChild<ElementRef<HTMLButtonElement>>('filterButton');

  private readonly coins = signal<Coin[]>([]);
  private readonly activeId = signal<string | null>(null);
  private readonly visibleLimit = signal(pageSize);
  private draftBaseline = '';
  private editorVersion = 0;
  private confirmResolve: ((result: boolean) => void) | null = null;

  readonly scopes: { key: Scope; name: string; icon: string }[] = [
    { key: 'all', name: 'Все монеты', icon: 'coin' },
    { key: 'missing', name: 'Без фото', icon: 'image' },
    { key: 'duplicates', name: 'С дублями', icon: 'stack' },
  ];
  readonly grades = grades;
  readonly sides = photoSides;
  readonly loadState = signal<'loading' | 'error' | 'unauthorized' | 'ready'>('loading');
  readonly count = computed(() => this.coins().length);
  readonly quantity = computed(() => this.coins().reduce((sum, coin) => sum + coin.quantity, 0));
  readonly countries = computed(() => [...new Map(this.coins().filter(coin => coin.country)
    .map(coin => [normalize(coin.country!), coin.country!] as const))]
    .sort((left, right) => collator.compare(left[1], right[1])));
  readonly scopeCounts = computed(() => ({
    all: this.count(),
    missing: this.coins().filter(coin => !coin.hasObverse && !coin.hasReverse).length,
    duplicates: this.coins().filter(coin => coin.quantity > 1).length,
  }));
  readonly scope = signal<Scope>('all');
  readonly query = signal('');
  readonly sort = signal<Sort>('latest');
  readonly view = signal<View>('grid');
  readonly filters = signal<Filters>({ country: '', grade: '' });
  readonly applied = computed(() => {
    const filters = this.filters();
    const chips: { key: keyof Filters; label: string }[] = [];
    if (filters.country) chips.push({ key: 'country', label: new Map(this.countries()).get(filters.country) ?? filters.country });
    if (filters.grade) chips.push({ key: 'grade', label: this.gradeLabel(filters.grade) });
    return chips;
  });
  readonly hasQuery = computed(() => !!this.query().trim() || this.applied().length > 0);
  readonly matching = computed(() => {
    const scope = this.scope();
    const terms = normalize(this.query()).split(/\s+/).filter(Boolean);
    const filters = this.filters();
    const matches = this.coins().filter(coin => {
      if (scope === 'missing' && (coin.hasObverse || coin.hasReverse)) return false;
      if (scope === 'duplicates' && coin.quantity < 2) return false;
      if (filters.country && normalize(coin.country ?? '') !== filters.country) return false;
      if (filters.grade && coin.grade !== filters.grade) return false;
      const target = normalize([coin.name, coin.country, coin.year, coin.value].join(' '));
      return terms.every(term => target.includes(term));
    });
    switch (this.sort()) {
      case 'name': return matches.sort((a, b) => collator.compare(a.name, b.name));
      case 'oldest': return matches.sort((a, b) => (a.year ?? Infinity) - (b.year ?? Infinity));
      case 'newest': return matches.sort((a, b) => (b.year ?? -Infinity) - (a.year ?? -Infinity));
      default: return matches.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    }
  });
  readonly visible = computed(() => this.matching().slice(0, this.visibleLimit()));
  readonly activeCoin = computed(() => this.coins().find(coin => coin.id === this.activeId()) ?? null);
  readonly notice = signal('');
  readonly draftPhotos = signal<Record<PhotoSide, PhotoDraft>>({ obverse: { preview: null }, reverse: { preview: null } });
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly photoPending = signal<PhotoSide[]>([]);
  readonly editorBusy = computed(() => this.saving() || this.photoPending().length > 0);
  readonly editorError = signal('');
  readonly detailsError = signal('');
  readonly zoom = signal<{ url: string; side: string; coin: string } | null>(null);
  readonly confirm = signal({ title: '', text: '', cancel: '', action: '' });
  editingId: string | null = null;
  draftFilters: Filters = { country: '', grade: '' };
  draft: CoinFields = this.emptyDraft();

  ngOnInit(): void {
    try {
      if (localStorage.getItem(viewPreference) === 'list') this.view.set('list');
    } catch { /* Вкладка работает и с отключённым хранилищем настроек. */ }
    this.load();
    this.destroyRef.onDestroy(() => {
      this.editorVersion++;
      this.releaseDraftPhotos();
      this.confirmResolve?.(false);
    });
  }

  load(): void {
    this.loadState.set('loading');
    this.api.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: items => {
        this.coins.set(items);
        this.loadState.set('ready');
      },
      error: (error: HttpErrorResponse) => this.loadState.set(error.status === 401 ? 'unauthorized' : 'error'),
    });
  }

  setScope(scope: Scope): void {
    this.scope.set(scope);
    this.visibleLimit.set(pageSize);
  }

  setQuery(query: string): void {
    this.query.set(query);
    this.visibleLimit.set(pageSize);
  }

  setSort(sort: Sort): void {
    this.sort.set(sort);
    this.visibleLimit.set(pageSize);
  }

  resetQuery(): void {
    this.scope.set('all');
    this.query.set('');
    this.filters.set({ country: '', grade: '' });
    this.visibleLimit.set(pageSize);
  }

  setView(view: View): void {
    this.view.set(view);
    try {
      localStorage.setItem(viewPreference, view);
    } catch { /* Настройка сохранится до закрытия вкладки. */ }
  }

  showMore(): void {
    this.visibleLimit.update(limit => limit + pageSize);
  }

  openFilters(): void {
    this.draftFilters = { ...this.filters() };
    this.filterDialog().nativeElement.showModal();
  }

  resetDraftFilters(): void {
    this.draftFilters = { country: '', grade: '' };
  }

  applyFilters(): void {
    this.filters.set({ ...this.draftFilters });
    this.visibleLimit.set(pageSize);
    this.filterDialog().nativeElement.close();
  }

  removeFilter(key: keyof Filters): void {
    this.filters.update(filters => ({ ...filters, [key]: '' }));
    this.visibleLimit.set(pageSize);
    this.filterButton()?.nativeElement.focus();
  }

  gradeLabel(code: string): string {
    const grade = grades.find(item => item.code === code);
    return grade ? grade.code + ' · ' + grade.label : code;
  }

  yearLabel(year: number): string {
    return year < 0 ? Math.abs(year) + ' до н. э.' : String(year);
  }

  info(coin: Coin): string {
    return [coin.value, coin.country, coin.year !== null ? this.yearLabel(coin.year) : ''].filter(Boolean).join(' · ');
  }

  photoUrl(coin: Coin, side: PhotoSide): string | null {
    return (side === 'obverse' ? coin.hasObverse : coin.hasReverse) ? this.api.photo(coin, side) : null;
  }

  openDetails(coin: Coin): void {
    this.activeId.set(coin.id);
    this.detailsError.set('');
    this.detailsDialog().nativeElement.showModal();
  }

  openZoom(coin: Coin, side: string, url: string): void {
    this.zoom.set({ url, side, coin: coin.name });
    this.zoomDialog().nativeElement.showModal();
  }

  edit(coin?: Coin): void {
    this.editingId = coin?.id ?? null;
    this.draft = coin ? {
      name: coin.name, country: coin.country, year: coin.year, value: coin.value, grade: coin.grade,
      quantity: coin.quantity, location: coin.location, notes: coin.notes,
    } : this.emptyDraft();
    this.draftBaseline = JSON.stringify(this.draft);
    this.draftPhotos.set({
      obverse: { preview: coin ? this.photoUrl(coin, 'obverse') : null },
      reverse: { preview: coin ? this.photoUrl(coin, 'reverse') : null },
    });
    this.editorError.set('');
    this.editorDialog().nativeElement.showModal();
  }

  async upload(event: Event, side: PhotoSide): Promise<void> {
    const input = event.target as HTMLInputElement;
    const photo = input.files?.[0];
    input.value = '';
    if (!photo || this.photoPending().includes(side) || this.saving()) return;
    const version = this.editorVersion;
    this.photoPending.update(items => [...items, side]);
    this.editorError.set('');
    try {
      const result = await prepareCoinPhoto(photo);
      if (version !== this.editorVersion) {
        URL.revokeObjectURL(result.preview);
        return;
      }
      this.setPhoto(side, { preview: result.preview, change: { data: result.data } });
    } catch {
      if (version === this.editorVersion) this.editorError.set('Не удалось открыть фото. Выберите JPG, PNG или WebP размером до 12 МБ.');
    } finally {
      if (version === this.editorVersion) this.photoPending.update(items => items.filter(key => key !== side));
    }
  }

  removePhoto(side: PhotoSide, input: HTMLInputElement): void {
    const original = this.coins().find(coin => coin.id === this.editingId);
    const existed = original && this.photoUrl(original, side);
    this.setPhoto(side, { preview: null, change: existed ? { remove: true } : undefined });
    input.focus();
  }

  save(): void {
    if (this.editorBusy()) return;
    if (!this.draft.name.trim() || this.draft.quantity == null) {
      this.editorError.set('Заполните название и количество экземпляров.');
      return;
    }
    const draft = this.draftPhotos();
    const request: CoinSave = { ...this.draft, name: this.draft.name.trim(), obverse: draft.obverse.change, reverse: draft.reverse.change };
    const id = this.editingId;
    this.saving.set(true);
    this.editorError.set('');
    this.api.save(request, id ?? undefined).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.saving.set(false)),
    ).subscribe({
      next: coin => {
        this.coins.update(items => [...items.filter(item => item.id !== coin.id), coin]);
        if (!id && !this.visible().some(item => item.id === coin.id)) {
          this.setSort('latest');
          this.resetQuery();
        }
        this.editorDialog().nativeElement.close();
        this.notify(id ? 'Изменения сохранены' : 'Монета добавлена');
      },
      error: (error: HttpErrorResponse) => this.editorError.set(
        error.status === 404 ? 'Монета уже удалена.' :
        error.status === 400 || error.status === 413 ? 'Проверьте данные и размер фотографий.' :
        'Не удалось сохранить монету. Попробуйте ещё раз.',
      ),
    });
  }

  async remove(coin: Coin): Promise<void> {
    const confirmed = await this.ask({
      title: 'Удалить монету?',
      text: 'Запись «' + coin.name + '» и её фото будут удалены из коллекции.',
      action: 'Удалить монету',
      cancel: 'Оставить монету',
    });
    if (!confirmed || this.deleting()) return;
    this.deleting.set(true);
    this.detailsError.set('');
    this.api.delete(coin.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.deleting.set(false)),
    ).subscribe({
      next: () => this.removeFromList(coin.id),
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) this.removeFromList(coin.id);
        else this.detailsError.set('Не удалось удалить монету. Попробуйте ещё раз.');
      },
    });
  }

  closeDetails(dialog: HTMLDialogElement): void {
    if (!this.deleting()) dialog.close();
  }

  closeDetailsOnEscape(event: Event): void {
    if (this.deleting()) event.preventDefault();
  }

  async closeEditor(event?: Event): Promise<void> {
    event?.preventDefault();
    if (await this.canCloseEditor()) this.editorDialog().nativeElement.close();
  }

  canDeactivate(): boolean | Promise<boolean> {
    if (this.deleting()) return false;
    if (!this.editorDialog().nativeElement.open) return true;
    return this.canCloseEditor();
  }

  cleanupEditor(): void {
    this.editorVersion++;
    this.releaseDraftPhotos();
  }

  finishConfirm(): void {
    const resolve = this.confirmResolve;
    this.confirmResolve = null;
    resolve?.(this.confirmDialog().nativeElement.returnValue === 'accept');
  }

  private removeFromList(id: string): void {
    this.detailsDialog().nativeElement.close();
    this.coins.update(items => items.filter(item => item.id !== id));
    this.activeId.set(null);
    this.notify('Монета удалена');
    this.addButton().nativeElement.focus({ preventScroll: true });
  }

  private notify(message: string): void {
    this.notice.set(message);
    this.toast.success(message);
  }

  private setPhoto(side: PhotoSide, photo: PhotoDraft): void {
    this.draftPhotos.update(images => {
      this.releasePhoto(images[side].preview);
      return { ...images, [side]: photo };
    });
  }

  private releasePhoto(url: string | null): void {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
  }

  private releaseDraftPhotos(): void {
    Object.values(this.draftPhotos()).forEach(photo => this.releasePhoto(photo.preview));
    this.draftPhotos.set({ obverse: { preview: null }, reverse: { preview: null } });
  }

  private canCloseEditor(): boolean | Promise<boolean> {
    if (this.editorBusy()) return false;
    const changed = this.draftBaseline !== JSON.stringify(this.draft)
      || Object.values(this.draftPhotos()).some(side => side.change);
    return !changed || this.ask({
      title: 'Сбросить изменения?',
      text: 'Изменения в карточке будут потеряны.',
      action: 'Сбросить изменения',
      cancel: 'Продолжить правки',
    });
  }

  private ask(confirmation: { title: string; text: string; action: string; cancel: string }): Promise<boolean> {
    if (this.confirmResolve) return Promise.resolve(false);
    this.confirm.set(confirmation);
    const dialog = this.confirmDialog().nativeElement;
    dialog.returnValue = 'cancel';
    return new Promise(resolve => {
      this.confirmResolve = resolve;
      dialog.showModal();
    });
  }

  private emptyDraft(): CoinFields {
    return { name: '', country: null, year: null, value: null, grade: null, quantity: 1, location: null, notes: null };
  }
}
