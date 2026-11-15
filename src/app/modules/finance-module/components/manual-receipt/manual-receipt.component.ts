import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, takeUntil } from 'rxjs';
import { BaseComponent } from '../../../../components/base/base.component';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  FINANCE_FALLBACK_DICTIONARIES,
  FinanceCategory,
  FinanceCategoryCode,
  FinanceDictionaries,
  FinanceReceipt,
} from '../../models/finance.model';
import { FinanceApiService } from '../../services/finance-api.service';
import { FinancePendingChanges } from '../../guards/finance-form-deactivate.guard';
import { currentMonth, isValidMonth, isValidPurchaseDate, localIsoDate, maxPurchaseDate, monthPrepositional, parseMoney } from '../../utils/finance-format';

@Component({
  selector: 'app-finance-manual-receipt',
  templateUrl: './manual-receipt.component.html',
  styleUrl: './manual-receipt.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceManualReceiptComponent extends BaseComponent implements OnInit, FinancePendingChanges {
  constructor(
    private api: FinanceApiService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private host: ElementRef<HTMLElement>,
  ) {
    super();
  }

  dictionaries: FinanceDictionaries = FINANCE_FALLBACK_DICTIONARIES;
  totalText: string = '';
  category: FinanceCategoryCode | null = null;
  purchasedOn: string = localIsoDate();
  store: string = '';
  note: string = '';
  errors: Record<string, string> = {};
  saving: boolean = false;
  readonly maxDate: string = maxPurchaseDate();

  private saved: boolean = false;
  private initialDate: string = this.purchasedOn;
  /** Месяц, из списка которого открыли форму: туда вернёмся после сохранения. */
  private returnMonth: string = currentMonth();

  ngOnInit(): void {
    // Открыли из прошлого месяца — по умолчанию его последний день, иначе расход «потеряется» из виду.
    const month: unknown = this.route.snapshot.queryParams['month'];
    if (isValidMonth(month as string) && month !== currentMonth()) {
      const [year, monthIndex] = (month as string).split('-').map(Number);
      this.purchasedOn = localIsoDate(new Date(year, monthIndex, 0));
      this.initialDate = this.purchasedOn;
      this.returnMonth = month as string;
    }

    this.api.getDictionaries()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((dictionaries: FinanceDictionaries) => {
        this.dictionaries = dictionaries;
        this.cdr.markForCheck();
      });
  }

  canDeactivate(): boolean {
    const dirty: boolean = !!(this.totalText.trim() || this.category || this.store.trim() || this.note.trim()
      || this.purchasedOn !== this.initialDate);
    return this.saved || !dirty || window.confirm('Выйти без сохранения?');
  }

  selectCategory(category: FinanceCategory): void {
    this.category = category.code;
    delete this.errors['category'];
  }

  save(): void {
    if (this.saving || this.saved) {
      return;
    }

    const errors: Record<string, string> = {};
    const total: number | null = parseMoney(this.totalText);
    if (total === null || total < 0.01 || total > 10_000_000) {
      errors['total'] = 'Укажите сумму';
    }
    if (!this.category) {
      errors['category'] = 'Выберите категорию';
    }
    if (!isValidPurchaseDate(this.purchasedOn)) {
      errors['purchasedOn'] = 'Укажите дату не позже сегодняшней';
    }
    this.errors = errors;
    if (Object.keys(errors).length) {
      this.cdr.markForCheck();
      this.revealFirstError();
      return;
    }

    this.saving = true;
    this.cdr.markForCheck();
    this.api.createManualReceipt({
      total: total!,
      category: this.category!,
      purchasedOn: this.purchasedOn,
      store: this.store.trim() || null,
      note: this.note.trim() || null,
    })
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.unsubscribe$),
      )
      .subscribe({
        next: (receipt: FinanceReceipt) => {
          this.saved = true;
          const month: string = receipt.purchasedOn.slice(0, 7);
          this.toast.success(month === this.returnMonth ? 'Расход добавлен' : `Расход добавлен и учтён в ${monthPrepositional(month)}`);
          this.leave(month);
        },
        error: (response: { error?: { details?: { field?: string; message?: string }[]; message?: string } }) => {
          const serverErrors: Record<string, string> = {};
          for (const detail of response?.error?.details ?? []) {
            if (detail.field) {
              serverErrors[detail.field] = detail.message ?? 'Ошибка';
            }
          }
          this.errors = serverErrors;
          this.cdr.markForCheck();
          this.revealFirstError(false);
          this.toast.error(response?.error?.details?.[0]?.message || response?.error?.message || 'Не удалось сохранить');
        },
      });
  }

  /** Ошибка может быть выше экрана (кнопка внизу): прокручиваем к первому полю с ошибкой и ставим фокус. */
  private revealFirstError(withToast: boolean = true): void {
    if (withToast) {
      this.toast.error('Проверьте выделенные поля');
    }
    setTimeout(() => {
      const field: HTMLElement | null = this.host.nativeElement.querySelector('[aria-invalid="true"]');
      field?.scrollIntoView({behavior: 'smooth', block: 'center'});
      const input: HTMLElement | null = field?.matches('input, textarea') ? field : field?.querySelector('button') ?? null;
      input?.focus({preventScroll: true});
    });
  }

  /** Назад к списку по истории (без лишней записи в ней); если форму открыли по прямой ссылке — к месяцу расхода. */
  private leave(month: string): void {
    const navigationId: number = (this.location.getState() as { navigationId?: number } | null)?.navigationId ?? 1;
    if (navigationId > 1) {
      this.location.back();
      return;
    }
    this.router.navigate(['/finance'], {queryParams: {month}, replaceUrl: true});
  }
}
