import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { catchError, exhaustMap, filter, forkJoin, of, Subject, switchMap, takeUntil, takeWhile, timer } from 'rxjs';
import { BaseComponent } from '../../components/base/base.component';
import { ToastService } from '../../shared/services/toast.service';
import {
  FINANCE_FALLBACK_DICTIONARIES,
  FinanceCategory,
  FinanceCategoryAmount,
  FinanceCategoryCode,
  FinanceDictionaries,
  FinanceReceipt,
  FinanceReceiptList,
  FinanceSummary,
  failureText,
} from './models/finance.model';
import { FinanceApiService } from './services/finance-api.service';
import { FinanceUploadService } from './services/finance-upload.service';
import {
  currentMonth,
  formatMoney,
  isValidMonth,
  monthPrepositional,
  monthTitle,
  pluralize,
  shiftMonth,
  shortDate,
} from './utils/finance-format';

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
    private uploads: FinanceUploadService,
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
  readonly failureText = failureText;

  private requestId: number = 0;
  /** Последний загруженный чек: если после распознавания он уедет в другой месяц, скажем куда. */
  private uploadedReceiptId: string | null = null;
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
      notes.push(`${otherCurrencyCount} ${pluralize(otherCurrencyCount, 'чек в другой валюте не входит', 'чека в другой валюте не входят', 'чеков в другой валюте не входят')} в итог`);
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
            takeWhile(() => month === this.month
              && ((this.shownSummary?.pendingCount ?? 0) > 0 || this.receipts.some((r: FinanceReceipt) => r.status === 'PENDING'))
              && Date.now() - startedAt < PENDING_POLL_LIMIT_MS),
            filter((tick: number) => Date.now() - startedAt < PENDING_POLL_FAST_MS || tick % 5 === 0),
            // Пока список перегружается, не спрашиваем: сравнение со старой сводкой зациклило бы перезагрузку.
            filter(() => !this.loading),
            exhaustMap(() => this.api.getSummary(month).pipe(catchError(() => of(null)))),
          );
        }),
        takeUntil(this.unsubscribe$),
      )
      .subscribe((summary: FinanceSummary | null) => {
        const current: FinanceSummary | null = this.shownSummary;
        // Сеть пропала — просто ждём следующего раза. Что-то распозналось — пересчитываем месяц целиком.
        const staleList: boolean = !!summary && summary.pendingCount === 0
          && this.receipts.some((r: FinanceReceipt) => r.status === 'PENDING');
        if (summary && current && summary.month === current.month
          && (staleList || summary.pendingCount !== current.pendingCount || summary.failedCount !== current.failedCount
            || summary.receiptCount !== current.receiptCount)) {
          this.load();
          this.reportUploadedReceipt();
        }
      });

    this.uploads.uploading$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((uploading: boolean) => {
        this.uploading = uploading;
        this.cdr.markForCheck();
      });
    this.uploads.uploaded$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((receipt: FinanceReceipt) => this.onUploaded(receipt));
    const undelivered: FinanceReceipt | null = this.uploads.takeUndelivered();

    timer(60_000, 60_000)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(() => this.checkMonthRollover());

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

    // Загрузка закончилась, пока списка не было на экране: показываем результат так же, как если бы он был открыт.
    if (undelivered) {
      this.onUploaded(undelivered);
    }
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
          // Список и сводка — разные запросы: чек мог распознаться между ними, поэтому смотрим на оба.
          if (summary.pendingCount > 0 || this.receipts.some((r: FinanceReceipt) => r.status === 'PENDING')) {
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
    if ((delta > 0 && month > currentMonth()) || month < '2000-01') {
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

  onFileSelected(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;
    const file: File | undefined = input.files?.[0];
    input.value = '';
    if (file && !this.uploading) {
      void this.uploads.upload(file);
    }
  }

  /** Чек загружен (возможно, пока пользователь был на другой странице модуля) — показываем его. */
  private onUploaded(receipt: FinanceReceipt): void {
    if (receipt.status !== 'PENDING') {
      this.openReceipt(receipt);
      return;
    }
    this.uploadedReceiptId = receipt.id;
    // Новый чек — в текущем месяце: показываем его там, где пользователь его увидит.
    if (this.month !== currentMonth() || this.category) {
      this.navigate({month: null, category: null});
    } else {
      this.load();
    }
  }

  /** Месяц списка передаём форме: дата по умолчанию — в нём, и после сохранения расход будет виден. */
  addManual(): void {
    this.router.navigate(['receipts', 'new'], {relativeTo: this.route, queryParams: {month: this.monthParam()}});
  }

  /**
   * Страница могла простоять открытой через полночь 1-го числа: «текущий месяц» (без параметра в адресе)
   * сдвигается, а OnPush-шаблон об этом не узнает. Проверяем при возврате на вкладку и раз в минуту.
   */
  @HostListener('document:visibilitychange')
  @HostListener('window:focus')
  checkMonthRollover(): void {
    if (document.visibilityState === 'hidden' || this.destroyed) {
      return;
    }
    const urlMonth: unknown = this.route.snapshot.queryParams['month'];
    if (!urlMonth && this.month !== currentMonth()) {
      this.navigate({month: null, category: this.category});
    } else {
      this.cdr.markForCheck();
    }
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

  /** Распознанная дата чека может быть в другом месяце (чек от 28 октября, снятый 1 ноября) — сообщаем, куда он попал. */
  private reportUploadedReceipt(): void {
    const receiptId: string | null = this.uploadedReceiptId;
    if (!receiptId) {
      return;
    }
    this.api.getReceipt(receiptId)
      .pipe(catchError(() => of(null)), takeUntil(this.unsubscribe$))
      .subscribe((receipt: FinanceReceipt | null) => {
        if (!receipt || receipt.status === 'PENDING' || this.uploadedReceiptId !== receiptId) {
          return;
        }
        this.uploadedReceiptId = null;
        const month: string = receipt.purchasedOn.slice(0, 7);
        if (receipt.status === 'READY' && month !== this.month) {
          this.toast.warning(`Чек от ${shortDate(receipt.purchasedOn)} учтён в ${monthPrepositional(month)} — откройте этот месяц`, 5000);
        }
      });
  }

  override ngOnDestroy(): void {
    this.destroyed = true;
    super.ngOnDestroy();
  }

  private monthParam(): string | null {
    return this.month === currentMonth() ? null : this.month;
  }

  private navigate(params: { month: string | null; category: FinanceCategoryCode | null }): void {
    // «Текущий месяц» — это отсутствие параметра. После полуночи 1-го числа адрес не меняется, роутер навигацию
    // пропускает и queryParams не эмитит — тогда применяем состояние сами.
    const current: Params = this.route.snapshot.queryParams;
    if ((current['month'] ?? null) === params.month && (current['category'] ?? null) === params.category) {
      const month: string = params.month ?? currentMonth();
      if (month !== this.month || params.category !== this.category) {
        this.receipts = [];
      }
      this.month = month;
      this.category = params.category;
      this.load();
      return;
    }

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
