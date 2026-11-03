import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, finalize, Observable, of, Subject, switchMap, takeUntil, catchError } from 'rxjs';
import { BaseComponent } from '../../../../components/base/base.component';
import { ToastService } from '../../../../shared/services/toast.service';
import { WardrobePendingChanges } from '../../guards/wardrobe-form-deactivate.guard';
import {
  WARDROBE_FALLBACK_DICTIONARIES,
  WardrobeApiErrorResponse,
  WardrobeCategory,
  WardrobeClassification,
  WardrobeColor,
  WardrobeDictionaries,
  WardrobeItem,
  WardrobeItemUpsertRequest,
  WardrobeSeason,
  WardrobeStyle,
} from '../../models/wardrobe.model';
import { WardrobeApiService } from '../../services/wardrobe-api.service';
import { WardrobeImageService } from '../../services/wardrobe-image.service';
import { prepareWardrobeImage, PreparedImage } from '../../utils/image-tools';
import { wornLabel } from '../../utils/wardrobe-format';

type AutoField = 'category' | 'colors' | 'seasons' | 'styles' | 'warmth';
type PhotoAction = 'keep' | 'replace' | 'remove';

interface ItemFormState {
  name: string;
  category: WardrobeCategory | null;
  colors: string[];
  seasons: WardrobeSeason[];
  styles: WardrobeStyle[];
  warmth: number;
  brand: string;
  notes: string;
  isFavorite: boolean;
}

const MAX_COLORS = 3;

@Component({
  selector: 'app-wardrobe-item-form',
  templateUrl: './item-form.component.html',
  styleUrl: './item-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WardrobeItemFormComponent extends BaseComponent implements OnInit, OnDestroy, WardrobePendingChanges {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('nameInput') nameInput?: ElementRef<HTMLInputElement>;

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

  readonly maxColors: number = MAX_COLORS;
  dictionaries: WardrobeDictionaries = WARDROBE_FALLBACK_DICTIONARIES;

  itemId: string | null = null;
  item: WardrobeItem | null = null;
  pageLoading: boolean = false;
  pageError: string = '';

  form: ItemFormState = this.emptyForm();
  errors: Partial<Record<keyof ItemFormState | 'file', string>> = {};
  submitted: boolean = false;
  saving: boolean = false;
  deleting: boolean = false;
  wearing: boolean = false;
  dirty: boolean = false;

  photoAction: PhotoAction = 'keep';
  photo: PreparedImage | null = null;
  photoProcessing: boolean = false;
  dominantHex: string | null = null;

  /** Поля, которые пользователь менял руками: автоклассификация их не трогает. */
  manual: Set<AutoField> = new Set();
  /** Поля, заполненные автоматически (показываем бейдж «авто»). */
  auto: Set<AutoField> = new Set();
  classification: WardrobeClassification | null = null;
  classifying: boolean = false;

  private readonly classify$: Subject<void> = new Subject<void>();
  private allowLeave: boolean = false;

  get isEdit(): boolean {
    return !!this.itemId;
  }

  get previewUrl(): string | null {
    return this.photoAction === 'replace' ? this.photo?.previewUrl ?? null : null;
  }

  get showStoredPhoto(): boolean {
    return this.photoAction === 'keep' && !!this.item?.hasImage;
  }

  get hasPhoto(): boolean {
    return !!this.previewUrl || this.showStoredPhoto;
  }

  get warmthName(): string {
    return this.dictionaries.warmthLevels.find((x) => x.level === this.form.warmth)?.name ?? '';
  }

  get wornText(): string {
    return this.item ? wornLabel(this.item.lastWornAt, this.item.wearCount) : '';
  }

  get classificationText(): string {
    const result: WardrobeClassification | null = this.classification;
    if (!result || !result.category) {
      return this.form.name.trim().length >= 3 ? 'Не удалось определить категорию — выберите вручную' : '';
    }

    const category: string = this.dictionaries.categories.find((x) => x.code === result.category)?.name ?? result.category;
    return `Похоже на «${category.toLowerCase()}» · уверенность ${Math.round(result.confidence * 100)}%`;
  }

  ngOnInit(): void {
    this.api.getDictionaries()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((dictionaries: WardrobeDictionaries) => {
        this.dictionaries = dictionaries;
        this.cdr.markForCheck();
      });

    this.classify$
      .pipe(
        debounceTime(350),
        switchMap(() => this.requestClassification()),
        takeUntil(this.unsubscribe$),
      )
      .subscribe((result: WardrobeClassification | null) => {
        this.classifying = false;
        if (result) {
          this.applyClassification(result, false);
        }
        this.cdr.markForCheck();
      });

    this.itemId = this.route.snapshot.paramMap.get('itemId');
    if (this.itemId) {
      this.loadItem(this.itemId);
    } else {
      setTimeout(() => this.nameInput?.nativeElement.focus(), 0);
    }
  }

  override ngOnDestroy(): void {
    this.releasePreview();
    super.ngOnDestroy();
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (!this.canLeave()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  canDeactivate(): boolean {
    return this.canLeave() || window.confirm('Выйти без сохранения?');
  }

  retry(): void {
    if (this.itemId) {
      this.loadItem(this.itemId);
    }
  }

  // ---------- поля ----------

  onNameInput(value: string): void {
    this.form.name = value;
    this.markDirty();
    this.validateField('name');
    this.scheduleClassification();
  }

  onNotesInput(value: string): void {
    this.form.notes = value;
    this.markDirty();
    this.validateField('notes');
    this.scheduleClassification();
  }

  onBrandInput(value: string): void {
    this.form.brand = value;
    this.markDirty();
    this.validateField('brand');
  }

  selectCategory(category: WardrobeCategory): void {
    this.form.category = category;
    this.touchManual('category');
    this.validateField('category');
  }

  toggleColor(code: string): void {
    if (this.form.colors.includes(code)) {
      this.form.colors = this.form.colors.filter((x: string) => x !== code);
    } else if (this.form.colors.length < MAX_COLORS) {
      this.form.colors = [...this.form.colors, code];
    } else {
      this.toast.warning(`Можно выбрать не больше ${MAX_COLORS} цветов`);
      return;
    }
    this.touchManual('colors');
    this.validateField('colors');
  }

  toggleSeason(code: WardrobeSeason): void {
    this.form.seasons = this.form.seasons.includes(code)
      ? this.form.seasons.filter((x: WardrobeSeason) => x !== code)
      : [...this.form.seasons, code];
    this.touchManual('seasons');
  }

  setAllSeasons(): void {
    this.form.seasons = [];
    this.touchManual('seasons');
  }

  toggleStyle(code: WardrobeStyle): void {
    this.form.styles = this.form.styles.includes(code)
      ? this.form.styles.filter((x: WardrobeStyle) => x !== code)
      : [...this.form.styles, code];
    this.touchManual('styles');
    this.validateField('styles');
  }

  setWarmth(level: number): void {
    this.form.warmth = level;
    this.touchManual('warmth');
  }

  toggleFavorite(): void {
    this.form.isFavorite = !this.form.isFavorite;
    this.markDirty();
  }

  /** Сбрасывает ручные правки и применяет автоопределение ко всем полям. */
  reclassify(): void {
    this.manual.clear();
    this.classifying = true;
    this.requestClassification()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((result: WardrobeClassification | null) => {
        this.classifying = false;
        if (result) {
          this.applyClassification(result, true);
          if (!result.category) {
            this.toast.warning('Не получилось определить вещь по названию');
          }
        }
        this.cdr.markForCheck();
      });
  }

  isAuto(field: AutoField): boolean {
    return this.auto.has(field);
  }

  // ---------- фото ----------

  pickPhoto(): void {
    this.fileInput?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input: HTMLInputElement = event.target as HTMLInputElement;
    const file: File | undefined = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.photoProcessing = true;
    this.errors.file = undefined;
    this.cdr.markForCheck();

    try {
      const prepared: PreparedImage = await prepareWardrobeImage(file);
      this.releasePreview();
      this.photo = prepared;
      this.photoAction = 'replace';
      this.dominantHex = prepared.dominantHex;
      this.markDirty();
      this.scheduleClassification(true);
    } catch (error: unknown) {
      this.errors.file = error instanceof Error ? error.message : 'Не удалось обработать фото';
    } finally {
      this.photoProcessing = false;
      this.cdr.markForCheck();
    }
  }

  removePhoto(): void {
    this.releasePreview();
    this.photo = null;
    this.dominantHex = null;
    this.photoAction = this.item?.hasImage ? 'remove' : 'keep';
    this.markDirty();
  }

  // ---------- действия ----------

  submit(): void {
    this.submitted = true;
    this.validateAll();
    if (this.hasErrors() || this.saving) {
      this.cdr.markForCheck();
      this.focusFirstError();
      return;
    }

    const payload: WardrobeItemUpsertRequest = this.buildPayload();
    this.saving = true;
    this.cdr.markForCheck();

    const save$: Observable<WardrobeItem> = this.itemId
      ? this.api.updateItem(this.itemId, payload)
      : this.api.createItem(payload);

    save$
      .pipe(
        switchMap((saved: WardrobeItem) => this.syncPhoto(saved)),
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({item, photoFailed}: { item: WardrobeItem; photoFailed: boolean }) => {
          if (photoFailed) {
            this.toast.warning('Вещь сохранена, но фото загрузить не удалось. Попробуйте сохранить ещё раз');
            if (this.isEdit) {
              this.item = item;
              return;
            }
            this.allowLeave = true;
            this.router.navigate(['/wardrobe/items', item.id, 'edit'], {replaceUrl: true});
            return;
          }

          this.allowLeave = true;
          this.dirty = false;

          this.toast.success(this.isEdit ? 'Изменения сохранены' : 'Вещь добавлена в гардероб');
          this.router.navigate(['/wardrobe']);
        },
        error: (error: { error?: WardrobeApiErrorResponse; status?: number }) => {
          if (error.status === 404) {
            this.toast.error('Вещь не найдена — возможно, её уже удалили');
            return;
          }
          if (!this.applyApiErrors(error.error)) {
            this.toast.error('Не удалось сохранить вещь');
          }
        },
      });
  }

  deleteItem(): void {
    if (!this.itemId || this.deleting || !window.confirm(`Удалить «${this.item?.name ?? 'вещь'}» из гардероба? Она пропадёт и из сохранённых образов.`)) {
      return;
    }

    this.deleting = true;
    this.api.deleteItem(this.itemId)
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.deleting = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.images.forget(this.itemId as string);
          this.allowLeave = true;
          this.toast.success('Вещь удалена');
          this.router.navigate(['/wardrobe']);
        },
        error: () => this.toast.error('Не удалось удалить вещь'),
      });
  }

  wearToday(): void {
    if (!this.itemId || this.wearing) {
      return;
    }

    this.wearing = true;
    this.api.wearItem(this.itemId)
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.wearing = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (updated: WardrobeItem) => {
          if (this.item) {
            this.item = {...this.item, wearCount: updated.wearCount, lastWornAt: updated.lastWornAt};
          }
          this.toast.success('Отмечено: надето сегодня');
        },
        error: () => this.toast.error('Не удалось отметить'),
      });
  }

  colorTitle(color: WardrobeColor): string {
    return this.form.colors.includes(color.code) ? `${color.name} — выбран` : color.name;
  }

  // ---------- приватное ----------

  private loadItem(itemId: string): void {
    this.pageLoading = true;
    this.pageError = '';
    this.cdr.markForCheck();

    this.api.getItem(itemId)
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.pageLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (item: WardrobeItem) => {
          this.item = item;
          this.form = {
            name: item.name,
            category: item.category,
            colors: [...item.colors],
            seasons: [...item.seasons],
            styles: [...item.styles],
            warmth: item.warmth,
            brand: item.brand ?? '',
            notes: item.notes ?? '',
            isFavorite: item.isFavorite,
          };
          // У существующей вещи все поля считаем заданными пользователем.
          this.manual = new Set<AutoField>(['category', 'colors', 'seasons', 'styles', 'warmth']);
          this.auto.clear();
          this.dirty = false;
        },
        error: (error: { status?: number }) => {
          this.pageError = error.status === 404 ? 'Вещь не найдена' : 'Не удалось загрузить вещь';
        },
      });
  }

  private scheduleClassification(force: boolean = false): void {
    if (this.manual.size === 5 && !force) {
      return;
    }
    if (this.form.name.trim().length < 2 && !this.dominantHex) {
      this.classification = null;
      return;
    }
    this.classifying = true;
    this.classify$.next();
  }

  private requestClassification(): Observable<WardrobeClassification | null> {
    const name: string = this.form.name.trim();
    const notes: string = this.form.notes.trim();
    if (!name && !this.dominantHex) {
      return of(null);
    }

    return this.api.classify(name.slice(0, 120), notes ? notes.slice(0, 1000) : null, this.dominantHex)
      .pipe(catchError(() => of(null)));
  }

  private applyClassification(result: WardrobeClassification, force: boolean): void {
    this.classification = result;
    const canSet = (field: AutoField): boolean => force || !this.manual.has(field);

    if (result.category && canSet('category')) {
      this.form.category = result.category;
      this.auto.add('category');
    }
    if (result.colors.length && canSet('colors')) {
      this.form.colors = result.colors.slice(0, MAX_COLORS);
      this.auto.add('colors');
    }
    if (result.category && canSet('seasons')) {
      this.form.seasons = [...result.seasons];
      this.auto.add('seasons');
    }
    if (result.styles.length && canSet('styles')) {
      this.form.styles = [...result.styles];
      this.auto.add('styles');
    }
    if (result.warmth && canSet('warmth')) {
      this.form.warmth = result.warmth;
      this.auto.add('warmth');
    }

    if (force) {
      this.markDirty();
    }
    if (this.submitted) {
      this.validateAll();
    }
  }

  private syncPhoto(saved: WardrobeItem): Observable<{ item: WardrobeItem; photoFailed: boolean }> {
    if (this.photoAction === 'replace' && this.photo) {
      const blob: Blob = this.photo.blob;
      return this.api.uploadImage(saved.id, blob).pipe(
        switchMap((updated: WardrobeItem) => {
          this.images.prime(updated, blob);
          return of({item: updated, photoFailed: false});
        }),
        catchError(() => of({item: saved, photoFailed: true})),
      );
    }

    if (this.photoAction === 'remove' && saved.hasImage) {
      return this.api.deleteImage(saved.id).pipe(
        switchMap((updated: WardrobeItem) => {
          this.images.forget(saved.id);
          return of({item: updated, photoFailed: false});
        }),
        catchError(() => of({item: saved, photoFailed: true})),
      );
    }

    return of({item: saved, photoFailed: false});
  }

  private buildPayload(): WardrobeItemUpsertRequest {
    return {
      name: this.form.name.trim(),
      category: this.form.category as WardrobeCategory,
      colors: this.form.colors,
      seasons: this.form.seasons,
      styles: this.form.styles,
      warmth: this.form.warmth,
      brand: this.form.brand.trim() || null,
      notes: this.form.notes.trim() || null,
      isFavorite: this.form.isFavorite,
    };
  }

  private validateField(field: keyof ItemFormState): void {
    if (!this.submitted && field !== 'name' && field !== 'brand' && field !== 'notes') {
      return;
    }

    const value = this.form;
    let error: string | undefined;
    switch (field) {
      case 'name':
        if (this.submitted && !value.name.trim()) {
          error = 'Введите название';
        } else if (value.name.trim().length > 120) {
          error = 'Не длиннее 120 символов';
        }
        break;
      case 'category':
        error = value.category ? undefined : 'Выберите категорию';
        break;
      case 'colors':
        error = value.colors.length ? undefined : 'Выберите хотя бы один цвет';
        break;
      case 'styles':
        error = value.styles.length ? undefined : 'Выберите хотя бы один стиль';
        break;
      case 'brand':
        error = value.brand.trim().length > 80 ? 'Не длиннее 80 символов' : undefined;
        break;
      case 'notes':
        error = value.notes.trim().length > 1000 ? 'Не длиннее 1000 символов' : undefined;
        break;
    }

    this.errors = {...this.errors, [field]: error};
  }

  private validateAll(): void {
    (['name', 'category', 'colors', 'styles', 'brand', 'notes'] as (keyof ItemFormState)[])
      .forEach((field: keyof ItemFormState) => this.validateField(field));
  }

  private hasErrors(): boolean {
    return Object.entries(this.errors).some(([key, value]) => key !== 'file' && !!value);
  }

  private focusFirstError(): void {
    setTimeout(() => {
      const element: HTMLElement | null = document.querySelector('.item-form [data-invalid="true"]');
      element?.scrollIntoView({behavior: 'smooth', block: 'center'});
      if (element instanceof HTMLInputElement) {
        element.focus();
      }
    }, 0);
  }

  private applyApiErrors(apiError?: WardrobeApiErrorResponse): boolean {
    if (!apiError || apiError.errorCode !== 'VALIDATION_ERROR' || !apiError.details?.length) {
      return false;
    }

    const next: Partial<Record<string, string>> = {...this.errors};
    apiError.details.forEach((detail) => {
      next[detail.field] = detail.message;
    });
    this.errors = next as typeof this.errors;
    this.focusFirstError();
    return true;
  }

  private touchManual(field: AutoField): void {
    this.manual.add(field);
    this.auto.delete(field);
    this.markDirty();
  }

  private markDirty(): void {
    this.dirty = true;
    this.cdr.markForCheck();
  }

  private canLeave(): boolean {
    return this.allowLeave || !this.dirty;
  }

  private releasePreview(): void {
    if (this.photo?.previewUrl) {
      URL.revokeObjectURL(this.photo.previewUrl);
    }
  }

  private emptyForm(): ItemFormState {
    return {
      name: '',
      category: null,
      colors: [],
      seasons: [],
      styles: ['CASUAL'],
      warmth: 2,
      brand: '',
      notes: '',
      isFavorite: false,
    };
  }
}
