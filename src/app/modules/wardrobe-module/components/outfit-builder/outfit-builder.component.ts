import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin, Observable, of, takeUntil } from 'rxjs';
import { BaseComponent } from '../../../../components/base/base.component';
import { ToastService } from '../../../../shared/services/toast.service';
import { WardrobePendingChanges } from '../../guards/wardrobe-form-deactivate.guard';
import {
  WARDROBE_CATEGORY_ICONS,
  WARDROBE_FALLBACK_DICTIONARIES,
  WardrobeApiErrorResponse,
  WardrobeCategory,
  WardrobeColor,
  WardrobeDictionaries,
  WardrobeDictionaryItem,
  WardrobeItem,
  WardrobeItemListResponse,
  WardrobeOutfit,
  WardrobeOutfitCreateRequest,
  WardrobeOutfitDraft,
  WardrobeStyle,
} from '../../models/wardrobe.model';
import { WardrobeApiService } from '../../services/wardrobe-api.service';
import { WardrobeStateService } from '../../services/wardrobe-state.service';

interface BuilderForm {
  name: string;
  occasion: WardrobeStyle;
  temperatureText: string;
  note: string;
  itemIds: string[];
}

interface SelectedGroup {
  category: WardrobeCategory;
  name: string;
  items: WardrobeItem[];
}

type BuilderField = 'name' | 'temperature' | 'note' | 'itemIds' | 'occasion';

export const OUTFIT_MIN_ITEMS = 2;
export const OUTFIT_MAX_ITEMS = 8;
const NAME_MAX = 80;
const NOTE_MAX = 500;
const TEMPERATURE_MIN = -60;
const TEMPERATURE_MAX = 60;

/** Конструктор образа: создание с нуля, доработка варианта из подбора и редактирование сохранённого. */
@Component({
  selector: 'app-wardrobe-outfit-builder',
  templateUrl: './outfit-builder.component.html',
  styleUrl: './outfit-builder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WardrobeOutfitBuilderComponent extends BaseComponent implements OnInit, WardrobePendingChanges {
  constructor(
    private api: WardrobeApiService,
    private state: WardrobeStateService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {
    super();
  }

  readonly maxItems: number = OUTFIT_MAX_ITEMS;
  readonly nameMax: number = NAME_MAX;
  readonly noteMax: number = NOTE_MAX;
  readonly categoryIcons: Record<WardrobeCategory, string> = WARDROBE_CATEGORY_ICONS;

  dictionaries: WardrobeDictionaries = WARDROBE_FALLBACK_DICTIONARIES;
  outfitId: string | null = null;
  outfit: WardrobeOutfit | null = null;
  /** Все вещи пользователя (из них собираем образ). */
  wardrobe: WardrobeItem[] = [];

  pageLoading: boolean = true;
  pageError: string = '';
  form: BuilderForm = {name: '', occasion: 'CASUAL', temperatureText: '', note: '', itemIds: []};
  errors: Partial<Record<BuilderField, string>> = {};
  submitted: boolean = false;
  saving: boolean = false;
  deleting: boolean = false;
  dirty: boolean = false;

  /** Фильтры списка вещей для добавления. */
  pickCategory: WardrobeCategory | null = null;
  pickQuery: string = '';

  private fromPicker: boolean = false;
  private openedFromOutfits: boolean = false;
  private allowLeave: boolean = false;
  /** Черновик из подбора: вещи, которых уже нет, отбрасываем при загрузке. */
  private draftMissing: number = 0;

  get isEdit(): boolean {
    return !!this.outfitId;
  }

  get selectedItems(): WardrobeItem[] {
    const byId: Map<string, WardrobeItem> = new Map(this.wardrobe.map((item: WardrobeItem) => [item.id, item]));
    return this.form.itemIds
      .map((id: string) => byId.get(id))
      .filter((item: WardrobeItem | undefined): item is WardrobeItem => !!item);
  }

  get selectedGroups(): SelectedGroup[] {
    const selected: WardrobeItem[] = this.selectedItems;
    return this.dictionaries.categories
      .map((category: WardrobeDictionaryItem<WardrobeCategory>) => ({
        category: category.code,
        name: category.name,
        items: selected.filter((item: WardrobeItem) => item.category === category.code),
      }))
      .filter((group: SelectedGroup) => group.items.length > 0);
  }

  get availableItems(): WardrobeItem[] {
    const query: string = this.pickQuery.trim().toLocaleLowerCase('ru');
    return this.wardrobe.filter((item: WardrobeItem) =>
      (!this.pickCategory || item.category === this.pickCategory)
      && (!query
        || item.name.toLocaleLowerCase('ru').includes(query)
        || (item.brand ?? '').toLocaleLowerCase('ru').includes(query)));
  }

  /** Подсказки, а не ошибки: образ без обуви или без основы сохранить можно. */
  get warnings(): string[] {
    const selected: WardrobeItem[] = this.selectedItems;
    if (selected.length < OUTFIT_MIN_ITEMS) {
      return [];
    }

    const has = (category: WardrobeCategory): boolean => selected.some((item: WardrobeItem) => item.category === category);
    const warnings: string[] = [];
    if (!has('DRESS') && !(has('TOP') && has('BOTTOM'))) {
      warnings.push(has('TOP') ? 'Нет низа — добавьте брюки, юбку или шорты'
        : has('BOTTOM') ? 'Нет верха — добавьте футболку, рубашку или свитер'
          : 'Нет основы образа — добавьте верх и низ или платье');
    }
    if (!has('SHOES') && this.form.occasion !== 'HOME') {
      warnings.push('Нет обуви');
    }
    return warnings;
  }

  get defaultName(): string {
    const style: string = this.styleName(this.form.occasion);
    const temperature: number | null = this.parseTemperature();
    return temperature === null || Number.isNaN(temperature)
      ? style
      : `${style}, ${temperature > 0 ? '+' : ''}${temperature}°C`;
  }

  get countLabel(): string {
    return `${this.form.itemIds.length} из ${OUTFIT_MAX_ITEMS}`;
  }

  ngOnInit(): void {
    this.api.getDictionaries()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((dictionaries: WardrobeDictionaries) => {
        this.dictionaries = dictionaries;
        this.cdr.markForCheck();
      });

    this.form = this.emptyForm();
    this.fromPicker = this.route.snapshot.queryParamMap.get('from') === 'picker';
    const previous: string | undefined = this.router.lastSuccessfulNavigation?.previousNavigation?.finalUrl?.toString();
    this.openedFromOutfits = !!previous && previous.split('?')[0] === '/wardrobe';
    this.outfitId = this.route.snapshot.paramMap.get('outfitId');

    // Черновик забираем сразу: повторное открытие конструктора не должно подставить его ещё раз.
    const draft: WardrobeOutfitDraft | null = !this.outfitId && this.fromPicker ? this.state.outfitDraft : null;
    this.state.outfitDraft = null;
    this.load(draft);
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
    this.load(null);
  }

  // ---------- поля ----------

  onNameInput(value: string): void {
    this.form.name = value;
    this.markDirty();
    this.validate('name');
  }

  selectOccasion(style: WardrobeStyle): void {
    this.form.occasion = style;
    this.markDirty();
  }

  onTemperatureInput(value: string): void {
    this.form.temperatureText = value;
    this.markDirty();
    this.validate('temperature');
  }

  onNoteInput(value: string): void {
    this.form.note = value;
    this.markDirty();
    this.validate('note');
  }

  isSelected(item: WardrobeItem): boolean {
    return this.form.itemIds.includes(item.id);
  }

  toggleItem(item: WardrobeItem): void {
    if (this.isSelected(item)) {
      this.removeItem(item);
      return;
    }
    if (this.form.itemIds.length >= OUTFIT_MAX_ITEMS) {
      this.toast.warning(`В образе может быть не больше ${OUTFIT_MAX_ITEMS} вещей`);
      return;
    }
    this.form.itemIds = [...this.form.itemIds, item.id];
    this.markDirty();
    this.validate('itemIds');
  }

  removeItem(item: WardrobeItem): void {
    this.form.itemIds = this.form.itemIds.filter((id: string) => id !== item.id);
    this.markDirty();
    this.validate('itemIds');
  }

  selectPickCategory(category: WardrobeCategory | null): void {
    this.pickCategory = this.pickCategory === category ? null : category;
  }

  onPickQuery(value: string): void {
    this.pickQuery = value;
  }

  // ---------- действия ----------

  submit(): void {
    this.submitted = true;
    this.validateAll();
    if (this.hasErrors() || this.saving) {
      this.focusFirstError();
      this.cdr.markForCheck();
      return;
    }

    const payload: WardrobeOutfitCreateRequest = {
      name: (this.form.name.trim() || this.defaultName).slice(0, NAME_MAX),
      itemIds: this.form.itemIds,
      occasion: this.form.occasion,
      temperature: this.parseTemperature(),
      note: this.form.note.trim() || null,
    };

    this.saving = true;
    this.cdr.markForCheck();
    const save$: Observable<WardrobeOutfit> = this.outfitId
      ? this.api.updateOutfit(this.outfitId, payload)
      : this.api.createOutfit(payload);

    save$
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.allowLeave = true;
          this.dirty = false;
          this.toast.success(this.isEdit ? 'Образ обновлён' : 'Образ сохранён');
          this.leave();
        },
        error: (error: { error?: WardrobeApiErrorResponse; status?: number }) => {
          if (error.status === 404) {
            this.allowLeave = true;
            this.pageError = 'Образ не найден — возможно, его уже удалили';
            return;
          }
          if (this.applyApiErrors(error.error)) {
            // Какой-то вещи уже нет (удалили в другой вкладке) — обновим список и уберём её из образа.
            if (error.error?.details?.some((detail) => detail.field === 'itemIds')) {
              this.reloadWardrobe();
            }
            return;
          }
          this.toast.error('Не удалось сохранить образ');
        },
      });
  }

  deleteOutfit(): void {
    if (!this.outfitId || this.deleting || !window.confirm(`Удалить образ «${this.outfit?.name ?? ''}»?`)) {
      return;
    }

    this.deleting = true;
    this.api.deleteOutfit(this.outfitId)
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.deleting = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.allowLeave = true;
          this.toast.success('Образ удалён');
          this.leave();
        },
        error: (error: { status?: number }) => {
          if (error.status === 404) {
            this.allowLeave = true;
            this.toast.success('Образ уже удалён');
            this.leave();
            return;
          }
          this.toast.error('Не удалось удалить образ');
        },
      });
  }

  styleName(style: WardrobeStyle): string {
    return this.dictionaries.styles.find((x: WardrobeDictionaryItem) => x.code === style)?.name ?? style;
  }

  categoryName(category: WardrobeCategory): string {
    return this.dictionaries.categories.find((x: WardrobeDictionaryItem) => x.code === category)?.name ?? category;
  }

  categoryCount(category: WardrobeCategory): number {
    return this.wardrobe.filter((item: WardrobeItem) => item.category === category).length;
  }

  colorHex(code: string | undefined): string | null {
    return this.dictionaries.colors.find((color: WardrobeColor) => color.code === code)?.hex ?? null;
  }

  trackById(_: number, entity: { id: string }): string {
    return entity.id;
  }

  trackByCategory(_: number, group: SelectedGroup): string {
    return group.category;
  }

  // ---------- приватное ----------

  private load(draft: WardrobeOutfitDraft | null): void {
    this.pageLoading = true;
    this.pageError = '';
    this.cdr.markForCheck();

    forkJoin({
      items: this.api.getItems({}),
      outfits: this.outfitId ? this.api.getOutfits() : of(null as WardrobeOutfit[] | null),
    })
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.pageLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({items, outfits}: { items: WardrobeItemListResponse; outfits: WardrobeOutfit[] | null }) => {
          this.wardrobe = items.items;
          const existing: Set<string> = new Set(this.wardrobe.map((item: WardrobeItem) => item.id));

          if (this.outfitId) {
            const outfit: WardrobeOutfit | undefined = outfits?.find((x: WardrobeOutfit) => x.id === this.outfitId);
            if (!outfit) {
              this.pageError = 'Образ не найден';
              return;
            }
            this.outfit = outfit;
            this.form = {
              name: outfit.name,
              occasion: outfit.occasion,
              temperatureText: outfit.temperature === null || outfit.temperature === undefined ? '' : String(outfit.temperature),
              note: outfit.note ?? '',
              itemIds: outfit.itemIds.filter((id: string) => existing.has(id)),
            };
          } else if (draft) {
            const itemIds: string[] = draft.itemIds.filter((id: string) => existing.has(id));
            this.draftMissing = draft.itemIds.length - itemIds.length;
            this.form = {
              name: draft.name,
              occasion: draft.occasion,
              temperatureText: draft.temperature === null ? '' : String(draft.temperature),
              note: '',
              itemIds: itemIds.slice(0, OUTFIT_MAX_ITEMS),
            };
            // Черновик ещё не сохранён — уход без сохранения должен спрашивать подтверждение.
            this.dirty = true;
            if (this.draftMissing > 0) {
              this.toast.warning('Некоторых вещей из подобранного образа уже нет в гардеробе');
            }
          }
        },
        error: () => {
          this.pageError = 'Не удалось загрузить гардероб';
        },
      });
  }

  private reloadWardrobe(): void {
    this.api.getItems({})
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (response: WardrobeItemListResponse) => {
          this.wardrobe = response.items;
          const existing: Set<string> = new Set(this.wardrobe.map((item: WardrobeItem) => item.id));
          this.form.itemIds = this.form.itemIds.filter((id: string) => existing.has(id));
          this.cdr.markForCheck();
        },
      });
  }

  /**
   * После сохранения или удаления конструктор не должен оставаться в истории:
   * из списка образов — шаг назад, иначе замена записи на вкладку «Образы».
   */
  private leave(): void {
    const previous: string | undefined = this.router.lastSuccessfulNavigation?.previousNavigation?.finalUrl?.toString();
    if (this.openedFromOutfits && previous?.split('?')[0] === '/wardrobe' && previous.includes('tab=outfits')) {
      this.location.back();
      return;
    }
    this.router.navigate(['/wardrobe'], {queryParams: {tab: 'outfits'}, replaceUrl: true});
  }

  private parseTemperature(): number | null {
    const text: string = this.form.temperatureText.trim().replace(',', '.').replace('−', '-');
    if (!text) {
      return null;
    }
    const value: number = Number(text);
    return Number.isFinite(value) ? Math.round(value) : NaN;
  }

  private validate(field: BuilderField): void {
    let error: string | undefined;
    switch (field) {
      case 'name':
        error = this.form.name.trim().length > NAME_MAX ? `Не длиннее ${NAME_MAX} символов` : undefined;
        break;
      case 'note':
        error = this.form.note.trim().length > NOTE_MAX ? `Не длиннее ${NOTE_MAX} символов` : undefined;
        break;
      case 'temperature': {
        const value: number | null = this.parseTemperature();
        error = value !== null && (Number.isNaN(value) || value < TEMPERATURE_MIN || value > TEMPERATURE_MAX)
          ? `Температура от ${TEMPERATURE_MIN} до +${TEMPERATURE_MAX} °C`
          : undefined;
        break;
      }
      case 'itemIds':
        if (!this.submitted) {
          error = undefined;
        } else if (this.form.itemIds.length < OUTFIT_MIN_ITEMS) {
          error = `Выберите хотя бы ${OUTFIT_MIN_ITEMS} вещи`;
        }
        break;
      case 'occasion':
        error = undefined;
        break;
    }
    this.errors = {...this.errors, [field]: error};
  }

  private validateAll(): void {
    (['name', 'note', 'temperature', 'itemIds', 'occasion'] as BuilderField[]).forEach((field: BuilderField) => this.validate(field));
  }

  private hasErrors(): boolean {
    return Object.values(this.errors).some((value: string | undefined) => !!value);
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

  private focusFirstError(): void {
    setTimeout(() => {
      const element: HTMLElement | null = document.querySelector('.builder [data-invalid="true"]');
      element?.scrollIntoView({behavior: 'smooth', block: 'center'});
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.focus();
      }
    }, 0);
  }

  private markDirty(): void {
    this.dirty = true;
    this.cdr.markForCheck();
  }

  private canLeave(): boolean {
    return this.allowLeave || !this.dirty || !!this.pageError;
  }

  private emptyForm(): BuilderForm {
    const picker = this.state.picker;
    return {
      name: '',
      occasion: picker?.occasion ?? 'CASUAL',
      temperatureText: '',
      note: '',
      itemIds: [],
    };
  }
}
