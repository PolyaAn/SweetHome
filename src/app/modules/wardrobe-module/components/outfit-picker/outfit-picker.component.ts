import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, Observable, of, switchMap, takeUntil } from 'rxjs';
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
import { defaultTemperature } from '../../utils/wardrobe-format';

interface SuggestionView {
  suggestion: OutfitSuggestion;
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
  private seed: number = this.randomSeed();

  get temperatureLabel(): string {
    return `${this.temperature > 0 ? '+' : ''}${this.temperature}°C`;
  }

  get weatherHint(): string {
    if (this.temperature < 15) {
      return 'Холодно — добавим верхнюю одежду';
    }
    if (this.temperature > 22) {
      return 'Тепло — обойдёмся без верхней одежды';
    }
    return 'Межсезонье — верхняя одежда по желанию';
  }

  ngOnInit(): void {
    this.api.getDictionaries()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((dictionaries: WardrobeDictionaries) => {
        this.dictionaries = dictionaries;
        this.cdr.markForCheck();
      });

    this.suggest();
  }

  selectOccasion(style: WardrobeStyle): void {
    if (this.occasion === style) {
      return;
    }
    this.occasion = style;
    this.suggest();
  }

  setTemperature(value: number, refresh: boolean = true): void {
    const clamped: number = Math.max(MIN_TEMPERATURE, Math.min(MAX_TEMPERATURE, Math.round(value)));
    this.temperature = clamped;
    this.temperatureText = String(clamped);
    if (refresh) {
      this.suggest();
    }
  }

  stepTemperature(delta: number): void {
    this.setTemperature(this.temperature + delta);
  }

  onTemperatureInput(value: string): void {
    this.temperatureText = value;
  }

  commitTemperature(): void {
    const parsed: number = Number(String(this.temperatureText).replace(',', '.').replace('−', '-'));
    if (!Number.isFinite(parsed) || String(this.temperatureText).trim() === '') {
      this.temperatureText = String(this.temperature);
      return;
    }
    if (Math.round(parsed) !== this.temperature) {
      this.setTemperature(parsed);
    } else {
      this.temperatureText = String(this.temperature);
    }
  }

  more(): void {
    this.seed = this.randomSeed();
    this.suggest(false);
  }

  suggest(resetSeed: boolean = false): void {
    if (resetSeed) {
      this.seed = this.randomSeed();
    }

    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();

    this.api.suggestOutfits({
      occasion: this.occasion,
      temperature: this.temperature,
      count: 3,
      seed: this.seed,
    })
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response: OutfitSuggestResponse) => {
          this.response = response;
          this.views = response.outfits.map((suggestion: OutfitSuggestion, index: number) => ({
            suggestion,
            name: this.defaultName(index),
            savedOutfit: null,
            busy: false,
            worn: false,
          }));
        },
        error: () => {
          this.error = 'Не удалось подобрать образы';
        },
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
    this.router.navigate(['/wardrobe/items/create']);
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
      name: (view.name.trim() || this.defaultName(0)).slice(0, 80),
      itemIds: view.suggestion.items.map((item: WardrobeItem) => item.id),
      occasion: this.occasion,
      temperature: this.temperature,
    }).pipe(
      switchMap((outfit: WardrobeOutfit) => {
        view.savedOutfit = outfit;
        return of(outfit);
      }),
    );
  }

  private defaultName(index: number): string {
    const base: string = `${this.styleName(this.occasion)}, ${this.temperatureLabel}`;
    return index ? `${base} · вариант ${index + 1}` : base;
  }

  private randomSeed(): number {
    return Math.floor(Math.random() * 1_000_000);
  }
}
