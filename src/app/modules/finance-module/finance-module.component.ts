import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { catchError, exhaustMap, filter, forkJoin, of, Subject, switchMap, takeUntil, takeWhile, timer } from 'rxjs';
import { BaseComponent } from '../../components/base/base.component';
import { ToastService } from '../../shared/services/toast.service';
import {
  FINANCE_FALLBACK_DICTIONARIES,
  FINANCE_FAILURE_TEXT,
  FinanceCategory,
  FinanceCategoryAmount,
  FinanceCategoryCode,
  FinanceDictionaries,
  FinanceReceipt,
  FinanceReceiptList,
  FinanceSummary,
} from './models/finance.model';
import { FinanceApiService } from './services/finance-api.service';
import {
  currentMonth,
  formatMoney,
  isValidMonth,
  localIsoDate,
  monthPrepositional,
  monthTitle,
  pluralize,
  shiftMonth,
  shortDate,
} from './utils/finance-format';
import { prepareReceiptImage } from './utils/receipt-image';

/** Первые 2 минуты спрашиваем каждые 3 с, потом каждые 15 с; всего не дольше 10 минут (очередь на сервере общая). */
const PENDING_POLL_FAST_MS = 2 * 60 * 1000;
const PENDING_POLL_LIMIT_MS = 10 * 60 * 1000;

@Component({
  selector: 'app-finance-module',
  templateUrl: './finance-module.component.html',
  styleUrl: './finance-module.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceModuleComponent extends BaseComponent implements OnInit, OnDestroy {
  constructor(
    private api: FinanceApiService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {
    super();
  }

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('receiptsSection') receiptsSection?: ElementRef<HTMLElement>;

  dictionaries: FinanceDictionaries = FINANCE_FALLBACK_DICTIONARIES;
  month: string = currentMonth();
  category: FinanceCategoryCode | null = null;

  summary: FinanceSummary | null = null;
  receipts: FinanceReceipt[] = [];
  override loading: boolean = true;
  error: string = '';
  uploading: boolean = false;

  readonly formatMoney = formatMoney;
  readonly shortDate = shortDate;
  readonly failureText = FINANCE_FAILURE_TEXT;

  private requestId: number = 0;
  /** Компонент уничтожен: загрузка фото, начатая до ухода со страницы, не должна никуда переходить. */
  private destroyed: boolean = false;
  /** После выбора категории показываем отфильтрованный список: на телефоне он ниже экрана. */
  private scrollToList: boolean = false;
  private readonly pendingPoll$: Subject<void> = new Subject<void>();

  get monthTitle(): string {
    return monthTitle(this.month);
  }

  get isCurrentMonth(): boolean {
    return this.month >= currentMonth();
  }

  /** Сводка именно выбранного месяца: при переключении старая не показывается под новым заголовком. */
  get shownSummary(): FinanceSummary | null {
    return this.summary && this.summary.month === this.month && !this.error ? this.summary : null;
  }

  get categories(): FinanceCategoryAmount[] {
    return this.shownSummary?.categories ?? [];
  }

  get selectedCategory(): FinanceCategory | null {
    return this.category ? this.categoryInfo(this.category) : null;
  }

  /** «на 12% меньше, чем в октябре» — только если в прошлом месяце были траты. */
  get comparison(): string {
    const summary: FinanceSummary | null = this.shownSummary;
    if (!summary || !summary.previousTotal) {
      return '';
    }
    const previous: string = monthPrepositional(shiftMonth(this.month, -1));
    const diff: number = summary.total - summary.previousTotal;
    const percent: number = Math.round(Math.abs(diff) / summary.previousTotal * 100);
    if (percent === 0) {
      return `Столько же, сколько в ${previous}`;
    }
    return `На ${percent}% ${diff > 0 ? 'больше' : 'меньше'}, чем в ${previous}`;
  }

  get statusNotes(): string[] {
    const summary: FinanceSummary | null = this.shownSummary;
    if (!summary) {
      return [];
    }
    const notes: string[] = [];
    const {pendingCount, failedCount, otherCurrencyCount} = summary;
    if (pendingCount) {
      notes.push(`${pendingCount} ${pluralize(pendingCount, 'чек распознаётся', 'чека распознаются', 'чеков распознаются')}`);
    }
    if (failedCount) {
      notes.push(`${failedCount} ${pluralize(failedCount, 'чек не распознан', 'чека не распознаны', 'чеков не распознаны')} — введите сумму вручную`);
    }
    if (otherCurrencyCount) {
      notes.push(`${otherCurrencyCount} ${pluralize(otherCurrencyCount, 'чек', 'чека', 'чеков')} в другой валюте не входят в итог`);
    }
    return notes;
  }

  ngOnInit(): void {
    this.api.getDictionaries()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((dictionaries: FinanceDictionaries) => {
        this.dictionaries = dictionaries;
        this.cdr.markForCheck();
      });

    // Пока чеки месяца распознаются, спрашиваем только сводку (сначала часто, потом реже, ограниченно по времени).
    // Сводка, а не список: при фильтре по категории нераспознанных чеков в списке нет.
    this.pendingPoll$
      .pipe(
        switchMap(() => {
          const startedAt: number = Date.now();
          const month: string = this.month;
          return timer(3000, 3000).pipe(
            takeWhile(() => month === this.month && (this.shownSummary?.pendingCount ?? 0) > 0
              && Date.now() - startedAt < PENDING_POLL_LIMIT_MS),
            filter((tick: number) => Date.now() - startedAt < PENDING_POLL_FAST_MS || tick % 5 === 0),
            exhaustMap(() => this.api.getSummary(month).pipe(catchError(() => of(null)))),
          );
        }),
        takeUntil(this.unsubscribe$),
      )
      .subscribe((summary: FinanceSummary | null) => {
        const current: FinanceSummary | null = this.shownSummary;
        // Сеть пропала — просто ждём следующего раза. Что-то распозналось — пересчитываем месяц целиком.
        if (summary && current && summary.month === current.month
          && (summary.pendingCount !== current.pendingCount || summary.failedCount !== current.failedCount
            || summary.receiptCount !== current.receiptCount)) {
          this.load();
        }
      });

    this.route.queryParams
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((params: Params) => {
        const month: string = isValidMonth(params['month']) ? params['month'] : currentMonth();
        const category: FinanceCategoryCode | null = this.isKnownCategory(params['category']) ? params['category'] : null;
        if (month !== this.month || category !== this.category) {
          // Чеки другого месяца или категории не показываем под новым заголовком, пока грузится новый список.
          this.receipts = [];
        }
        this.month = month;
        this.category = category;
        this.load();
      });
  }

  load(): void {
    const requestId: number = ++this.requestId;
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();

    forkJoin({
      summary: this.api.getSummary(this.month),
      list: this.api.getReceipts(this.month, this.category),
    })
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: ({summary, list}: { summary: FinanceSummary; list: FinanceReceiptList }) => {
          if (requestId !== this.requestId) {
            return;
          }
          this.summary = summary;
          this.receipts = list.receipts;
          this.loading = false;
          this.cdr.detectChanges();
          if (this.scrollToList) {
            this.scrollToList = false;
            this.receiptsSection?.nativeElement.scrollIntoView({behavior: 'smooth', block: 'start'});
          }
          if (summary.pendingCount > 0) {
            this.pendingPoll$.next();
          }
        },
        error: () => {
          if (requestId !== this.requestId) {
            return;
          }
          this.loading = false;
          this.error = 'Не удалось загрузить расходы';
          this.cdr.markForCheck();
        },
      });
  }

  changeMonth(delta: number): void {
    const month: string = shiftMonth(this.month, delta);
    if (delta > 0 && month > currentMonth()) {
      return;
    }
    this.navigate({month: month === currentMonth() ? null : month, category: this.category});
  }

  toggleCategory(code: FinanceCategoryCode): void {
    this.scrollToList = this.category !== code;
    this.navigate({month: this.monthParam(), category: this.category === code ? null : code});
  }

  clearCategory(): void {
    this.navigate({month: this.monthParam(), category: null});
  }

  pickPhoto(): void {
    if (!this.uploading) {
      this.fileInput?.nativeElement.click();
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input: HTMLInputElement = event.target as HTMLInputElement;
    const file: File | undefined = input.files?.[0];
    input.value = '';
    if (!file || this.uploading) {
      return;
    }

    this.uploading = true;
    this.cdr.markForCheck();

    let blob: Blob;
    try {
      blob = await prepareReceiptImage(file);
    } catch (error) {
      if (this.destroyed) {
        return;
      }
      this.uploading = false;
      this.toast.error(error instanceof Error ? error.message : 'Не удалось обработать фото');
      this.cdr.markForCheck();
      return;
    }

    // Пока фото сжималось, пользователь мог уйти со страницы: takeUntil на уже завершённом unsubscribe$ не сработает.
    if (this.destroyed) {
      return;
    }

    this.api.uploadReceipt(blob, localIsoDate())
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (receipt: FinanceReceipt) => {
          this.uploading = false;
          if (receipt.status === 'PENDING') {
            this.toast.success('Чек загружен — распознаём сумму и категории');
            // Новый чек — в текущем месяце: показываем его там, где пользователь его увидит.
            if (this.month !== currentMonth() || this.category) {
              this.navigate({month: null, category: null});
            } else {
              this.load();
            }
          } else {
            this.toast.warning('Фото сохранено. Распознавание недоступно — введите сумму вручную');
            this.openReceipt(receipt);
          }
          this.cdr.markForCheck();
        },
        error: (response: { error?: { details?: { message?: string }[]; message?: string } }) => {
          this.uploading = false;
          this.toast.error(response?.error?.details?.[0]?.message || response?.error?.message || 'Не удалось загрузить чек');
          this.cdr.markForCheck();
        },
      });
  }

  addManual(): void {
    this.router.navigate(['receipts', 'new'], {relativeTo: this.route});
  }

  openReceipt(receipt: FinanceReceipt): void {
    this.router.navigate(['receipts', receipt.id], {relativeTo: this.route});
  }

  onReceiptKey(event: Event, receipt: FinanceReceipt): void {
    event.preventDefault();
    this.openReceipt(receipt);
  }

  categoryInfo(code: FinanceCategoryCode): FinanceCategory {
    return this.dictionaries.categories.find((c: FinanceCategory) => c.code === code)
      ?? FINANCE_FALLBACK_DICTIONARIES.categories.find((c: FinanceCategory) => c.code === code)
      ?? {code, name: code, icon: 'more_horiz', color: '#90A4AE'};
  }

  share(amount: number): number {
    const total: number = this.shownSummary?.total ?? 0;
    return total > 0 ? amount / total * 100 : 0;
  }

  shareLabel(amount: number): string {
    const value: number = this.share(amount);
    return value > 0 && value < 1 ? '<1%' : `${Math.round(value)}%`;
  }

  receiptTitle(receipt: FinanceReceipt): string {
    if (receipt.store) {
      return receipt.store;
    }
    if (receipt.status === 'PENDING') {
      return 'Чек распознаётся';
    }
    return receipt.status === 'FAILED' ? 'Чек без суммы' : this.categoryInfo(receipt.category).name;
  }

  receiptAmount(receipt: FinanceReceipt): string {
    if (receipt.status !== 'READY') {
      return '';
    }
    return formatMoney(this.category && receipt.categoryAmount !== null ? receipt.categoryAmount : receipt.total, receipt.currency);
  }

  trackById(_: number, value: { id: string }): string {
    return value.id;
  }

  trackByCategory(_: number, value: FinanceCategoryAmount): string {
    return value.category;
  }

  override ngOnDestroy(): void {
    this.destroyed = true;
    super.ngOnDestroy();
  }

  private monthParam(): string | null {
    return this.month === currentMonth() ? null : this.month;
  }

  private navigate(params: { month: string | null; category: FinanceCategoryCode | null }): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private isKnownCategory(value: unknown): value is FinanceCategoryCode {
    return typeof value === 'string' && FINANCE_FALLBACK_DICTIONARIES.categories.some((c: FinanceCategory) => c.code === value);
  }
}
