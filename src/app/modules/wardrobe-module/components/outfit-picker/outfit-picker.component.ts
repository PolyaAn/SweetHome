import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, Subject, switchMap, takeUntil, tap, timer } from 'rxjs';
import { BaseComponent } from '../../../../components/base/base.component';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  OutfitSuggestion,
  OutfitSuggestResponse,
  WARDROBE_FALLBACK_DICTIONARIES,
  WardrobeDictionaries,
  WardrobeDictionaryItem,
  WardrobeItem,
  WardrobeOutfit,
  WardrobeStyle,
} from '../../models/wardrobe.model';
import { WardrobeApiService } from '../../services/wardrobe-api.service';
import { WardrobeStateService } from '../../services/wardrobe-state.service';
import { defaultTemperature } from '../../utils/wardrobe-format';

interface SuggestParams {
  occasion: WardrobeStyle;
  temperature: number;
  seed: number;
}

interface SuggestionView {
  suggestion: OutfitSuggestion;
  /** Параметры, для которых получен именно этот вариант (а не текущие значения в форме). */
  params: SuggestParams;
  name: string;
  savedOutfit: WardrobeOutfit | null;
  busy: boolean;
  worn: boolean;
}

const MIN_TEMPERATURE = -40;
const MAX_TEMPERATURE = 45;

@Component({
  selector: 'app-wardrobe-outfit-picker',
  templateUrl: './outfit-picker.component.html',
  styleUrl: './outfit-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WardrobeOutfitPickerComponent extends BaseComponent implements OnInit {
  constructor(
    private api: WardrobeApiService,
    private state: WardrobeStateService,
    private router: Router,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {
    super();
  }

  readonly temperaturePresets: number[] = [-15, -5, 5, 15, 25];
  readonly minTemperature: number = MIN_TEMPERATURE;
  readonly maxTemperature: number = MAX_TEMPERATURE;

  dictionaries: WardrobeDictionaries = WARDROBE_FALLBACK_DICTIONARIES;
  occasion: WardrobeStyle = 'CASUAL';
  temperature: number = defaultTemperature();
  temperatureText: string = String(this.temperature);

  override loading: boolean = false;
  error: string = '';
  response: OutfitSuggestResponse | null = null;
  views: SuggestionView[] = [];
  /** Параметры показанных результатов: если пользователь уже поменял повод/погоду, подсказываем обновить. */
  shownParams: SuggestParams | null = null;
  private seed: number = this.randomSeed();
  private readonly request$: Subject<{ params: SuggestParams; immediate: boolean }> = new Subject();

  get temperatureLabel(): string {
    return `${this.temperature > 0 ? '+' : ''}${this.temperature}°C`;
  }

  get isHome(): boolean {
    return this.occasion === 'HOME';
  }

  get weatherHint(): string {
    if (this.isHome) {
      return 'Для дома погода не важна — подбираем образ для комнаты';
    }
    if (this.temperature < 15) {
      return 'Холодно — добавим верхнюю одежду';
    }
    if (this.temperature > 22) {
      return 'Тепло — обойдёмся без верхней одежды';
    }
    return 'Межсезонье — верхняя одежда по желанию';
  }

  get isStale(): boolean {
    return !!this.shownParams
      && (this.shownParams.occasion !== this.occasion || this.shownParams.temperature !== this.temperature);
  }

  ngOnInit(): void {
    // Повод и погода переживают уход на другие экраны гардероба (например, «Добавить вещь»).
    if (this.state.picker) {
      this.occasion = this.state.picker.occasion;
      this.temperature = this.state.picker.temperature;
      this.temperatureText = String(this.temperature);
    }

    this.api.getDictionaries()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((dictionaries: WardrobeDictionaries) => {
        this.dictionaries = dictionaries;
        this.cdr.markForCheck();
      });

    // Каждый новый запрос отменяет предыдущий (switchMap): на экране всегда результат последних параметров.
    this.request$
      .pipe(
        // timer, а не debounceTime: of() завершается сразу и debounceTime тут же отдал бы значение.
        switchMap(({params, immediate}) => (immediate ? of(params) : timer(350).pipe(map(() => params))).pipe(
          tap(() => {
            this.loading = true;
            this.error = '';
            this.cdr.markForCheck();
          }),
          switchMap((p: SuggestParams) => this.api.suggestOutfits({
            occasion: p.occasion,
            temperature: p.temperature,
            count: 3,
            seed: p.seed,
          }).pipe(
            map((response: OutfitSuggestResponse) => ({params: p, response, failed: false})),
            catchError(() => of({params: p, response: null as OutfitSuggestResponse | null, failed: true})),
          )),
        )),
        takeUntil(this.unsubscribe$),
      )
      .subscribe(({params, response, failed}) => {
        this.loading = false;
        if (failed || !response) {
          this.error = 'Не удалось подобрать образы';
        } else {
          this.response = response;
          this.shownParams = params;
          this.views = response.outfits.map((suggestion: OutfitSuggestion, index: number) => ({
            suggestion,
            params,
            name: this.defaultName(params, index),
            savedOutfit: null,
            busy: false,
            worn: false,
          }));
        }
        this.cdr.markForCheck();
      });

    this.suggest(false, true);
  }

  selectOccasion(style: WardrobeStyle): void {
    if (this.occasion === style) {
      return;
    }
    this.commitTemperature(false);
    this.occasion = style;
    this.suggest(false);
  }

  setTemperature(value: number, refresh: boolean = true): void {
    const clamped: number = Math.max(MIN_TEMPERATURE, Math.min(MAX_TEMPERATURE, Math.round(value)));
    this.temperature = clamped;
    this.temperatureText = String(clamped);
    if (refresh) {
      this.suggest(false);
    }
  }

  stepTemperature(delta: number): void {
    // Сначала фиксируем набранное (на iOS кнопка не забирает фокус у поля и blur не срабатывает).
    this.commitTemperature(false);
    this.setTemperature(this.temperature + delta);
  }

  onTemperatureInput(value: string): void {
    this.temperatureText = value;
  }

  commitTemperature(refresh: boolean = true): void {
    const parsed: number = Number(String(this.temperatureText).replace(',', '.').replace('−', '-'));
    if (!Number.isFinite(parsed) || String(this.temperatureText).trim() === '') {
      this.temperatureText = String(this.temperature);
      return;
    }
    if (Math.round(parsed) !== this.temperature) {
      this.setTemperature(parsed, refresh);
    } else {
      this.temperatureText = String(this.temperature);
    }
  }

  toggleSign(): void {
    this.commitTemperature(false);
    this.setTemperature(-this.temperature);
  }

  more(): void {
    this.commitTemperature(false);
    this.suggest(true, true);
  }

  /** «Подобрать»: сразу, с текущими параметрами. */
  pick(): void {
    this.commitTemperature(false);
    this.suggest(true, true);
  }

  /**
   * Изменения повода/погоды подбирают образы с небольшой задержкой (быстрые нажатия «−»/«+» дают один запрос),
   * кнопки «Подобрать» и «Ещё варианты» — сразу.
   */
  suggest(newSeed: boolean = false, immediate: boolean = false): void {
    if (newSeed) {
      this.seed = this.randomSeed();
    }

    this.state.picker = {occasion: this.occasion, temperature: this.temperature};
    this.request$.next({
      params: {occasion: this.occasion, temperature: this.temperature, seed: this.seed},
      immediate,
    });
  }

  onNameInput(view: SuggestionView, value: string): void {
    view.name = value;
  }

  save(view: SuggestionView): void {
    if (view.busy || view.savedOutfit) {
      return;
    }

    view.busy = true;
    this.cdr.markForCheck();
    this.ensureSaved(view)
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          view.busy = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => this.toast.success('Образ сохранён'),
        error: () => this.toast.error('Не удалось сохранить образ'),
      });
  }

  wear(view: SuggestionView): void {
    if (view.busy || view.worn) {
      return;
    }

    view.busy = true;
    this.cdr.markForCheck();
    this.ensureSaved(view)
      .pipe(
        switchMap((outfit: WardrobeOutfit) => this.api.wearOutfit(outfit.id)),
        takeUntil(this.unsubscribe$),
        finalize(() => {
          view.busy = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (outfit: WardrobeOutfit) => {
          view.savedOutfit = outfit;
          view.worn = true;
          this.toast.success('Отличный выбор! Образ сохранён и отмечен как надетый');
        },
        error: () => this.toast.error('Не удалось отметить образ'),
      });
  }

  openOutfits(): void {
    this.router.navigate(['/wardrobe'], {queryParams: {tab: 'outfits'}});
  }

  addItem(): void {
    this.commitTemperature(false);
    this.state.picker = {occasion: this.occasion, temperature: this.temperature};
    this.router.navigate(['/wardrobe/items/create'], {queryParams: {from: 'picker'}});
  }

  styleName(style: WardrobeStyle): string {
    return this.dictionaries.styles.find((x: WardrobeDictionaryItem) => x.code === style)?.name ?? style;
  }

  trackByIndex(index: number): number {
    return index;
  }

  private ensureSaved(view: SuggestionView): Observable<WardrobeOutfit> {
    if (view.savedOutfit) {
      return of(view.savedOutfit);
    }

    return this.api.createOutfit({
      name: (view.name.trim() || this.defaultName(view.params, 0)).slice(0, 80),
      itemIds: view.suggestion.items.map((item: WardrobeItem) => item.id),
      occasion: view.params.occasion,
      temperature: view.params.temperature,
    }).pipe(
      switchMap((outfit: WardrobeOutfit) => {
        view.savedOutfit = outfit;
        return of(outfit);
      }),
    );
  }

  private defaultName(params: SuggestParams, index: number): string {
    const temperature: string = `${params.temperature > 0 ? '+' : ''}${params.temperature}°C`;
    const base: string = `${this.styleName(params.occasion)}, ${temperature}`;
    return index ? `${base} · вариант ${index + 1}` : base;
  }

  private randomSeed(): number {
    return Math.floor(Math.random() * 1_000_000);
  }
}
