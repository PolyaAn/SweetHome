import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
import { localIsoDate, parseMoney } from '../../utils/finance-format';

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
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
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

  private saved: boolean = false;
  private readonly initialDate: string = this.purchasedOn;

  ngOnInit(): void {
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
    if (this.saving) {
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.purchasedOn)) {
      errors['purchasedOn'] = 'Укажите дату';
    }
    this.errors = errors;
    if (Object.keys(errors).length) {
      this.cdr.markForCheck();
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
          this.toast.success('Расход добавлен');
          this.leave(receipt.purchasedOn);
        },
        error: (response: { error?: { details?: { field?: string; message?: string }[]; message?: string } }) => {
          const serverErrors: Record<string, string> = {};
          for (const detail of response?.error?.details ?? []) {
            if (detail.field) {
              serverErrors[detail.field] = detail.message ?? 'Ошибка';
            }
          }
          this.errors = serverErrors;
          this.toast.error(response?.error?.details?.[0]?.message || response?.error?.message || 'Не удалось сохранить');
        },
      });
  }

  private leave(purchasedOn: string): void {
    // Показываем месяц, в который попал расход: дату могли выбрать в прошлом месяце.
    this.router.navigate(['/finance'], {queryParams: {month: purchasedOn.slice(0, 7)}, replaceUrl: true});
  }
}
