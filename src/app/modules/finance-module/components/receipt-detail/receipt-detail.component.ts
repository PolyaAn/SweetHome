import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { catchError, exhaustMap, filter, finalize, of, Subscription, takeUntil, takeWhile, timer } from 'rxjs';
import { BaseComponent } from '../../../../components/base/base.component';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  FINANCE_FALLBACK_DICTIONARIES,
  FinanceCategory,
  FinanceCategoryCode,
  FinanceDictionaries,
  FinanceReceipt,
  FinanceReceiptItem,
  FinanceReceiptUpdateRequest,
  failureText,
} from '../../models/finance.model';
import { FinanceApiService } from '../../services/finance-api.service';
import { FinancePendingChanges } from '../../guards/finance-form-deactivate.guard';
import { formatMoney, isValidPurchaseDate, maxPurchaseDate, monthPrepositional, moneyInput, parseMoney } from '../../utils/finance-format';

interface ItemDraft {
  /** Локальный ключ для trackBy (у новых позиций id ещё нет). */
  key: string;
  id: string | null;
  name: string;
  amountText: string;
  /** Сумма как пришла с сервера: количество и цену обнуляем, только если сумму действительно правили. */
  originalAmountText: string;
  quantity: number | null;
  price: number | null;
  category: FinanceCategoryCode;
}

interface ReceiptDraft {
  purchasedOn: string;
  currency: string;
  store: string;
  totalText: string;
  category: FinanceCategoryCode;
  note: string;
  items: ItemDraft[];
}

const KNOWN_CURRENCIES: { code: string; name: string }[] = [
  {code: 'RUB', name: '₽ рубли'}, {code: 'USD', name: '$ доллары'}, {code: 'EUR', name: '€ евро'},
  {code: 'CNY', name: '¥ юани'}, {code: 'JPY', name: '¥ иены'}, {code: 'GBP', name: '£ фунты'},
  {code: 'KZT', name: '₸ тенге'}, {code: 'TRY', name: '₺ лиры'}, {code: 'GEL', name: '₾ лари'},
  {code: 'AMD', name: '֏ драмы'}, {code: 'BYN', name: 'Br бел. рубли'}, {code: 'XXX', name: 'Не определена'},
];

const PENDING_POLL_FAST_MS = 2 * 60 * 1000;
const PENDING_POLL_LIMIT_MS = 10 * 60 * 1000;

@Component({
  selector: 'app-finance-receipt-detail',
  templateUrl: './receipt-detail.component.html',
  styleUrl: './receipt-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceReceiptDetailComponent extends BaseComponent implements OnInit, OnDestroy, FinancePendingChanges {
  constructor(
    private api: FinanceApiService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private host: ElementRef<HTMLElement>,
  ) {
    super();
  }

  dictionaries: FinanceDictionaries = FINANCE_FALLBACK_DICTIONARIES;
  receiptId: string = '';
  receipt: FinanceReceipt | null = null;
  draft: ReceiptDraft | null = null;
  loadError: string = '';
  errors: Record<string, string> = {};

  /** Пока чек распознаётся, форма закрыта; «Заполнить вручную» открывает её (сохранение отменит распознавание). */
  editUnlocked: boolean = false;
  saving: boolean = false;
  deleting: boolean = false;
  recognizing: boolean = false;

  /** Распознавание идёт дольше лимита опроса — показываем это, а не вечный спиннер. */
  pollTimedOut: boolean = false;
  readonly maxDate: string = maxPurchaseDate();

  /** Валюты, которые знает распознавание; XXX — «не определена», такой чек не входит в рублёвые итоги. */
  currencies: { code: string; name: string }[] = KNOWN_CURRENCIES;

  photoUrl: string | null = null;
  photoExpanded: boolean = false;
  photoError: boolean = false;

  readonly formatMoney = formatMoney;
  readonly failureText = failureText;

  private snapshot: string = '';
  private nextKey: number = 0;
  private poll?: Subscription;
  private skipGuard: boolean = false;

  get pending(): boolean {
    return this.receipt?.status === 'PENDING';
  }

  get formDisabled(): boolean {
    return (this.pending && !this.editUnlocked) || this.saving || this.deleting;
  }

  get itemsTotal(): number {
    return (this.draft?.items ?? []).reduce((sum: number, item: ItemDraft) => sum + (parseMoney(item.amountText) ?? 0), 0);
  }

  get total(): number | null {
    return this.draft ? parseMoney(this.draft.totalText) : null;
  }

  /** Расхождение суммы позиций и итога (скидки, округления, нераспознанные строки) — больше копейки. */
  get mismatch(): boolean {
    const total: number | null = this.total;
    return !!this.draft?.items.length && total !== null && Math.abs(this.itemsTotal - total) >= 0.01;
  }

  get canRecognizeAgain(): boolean {
    return !!this.receipt?.hasImage && this.dictionaries.recognition && !this.pending;
  }

  ngOnInit(): void {
    this.api.getDictionaries()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((dictionaries: FinanceDictionaries) => {
        this.dictionaries = dictionaries;
        this.cdr.markForCheck();
      });

    this.receiptId = this.route.snapshot.paramMap.get('receiptId') ?? '';
    this.load();
  }

  override ngOnDestroy(): void {
    this.poll?.unsubscribe();
    if (this.photoUrl) {
      URL.revokeObjectURL(this.photoUrl);
    }
    super.ngOnDestroy();
  }

  canDeactivate(): boolean {
    return this.skipGuard || !this.isDirty() || window.confirm('Выйти без сохранения?');
  }

  load(): void {
    this.loadError = '';
    this.api.getReceipt(this.receiptId)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (receipt: FinanceReceipt) => {
          this.apply(receipt);
          if (receipt.hasImage && !this.photoUrl) {
            this.loadPhoto();
          }
        },
        error: (response: { status?: number }) => {
          this.loadError = response?.status === 404 ? 'Чек не найден — возможно, его уже удалили' : 'Не удалось загрузить чек';
          this.cdr.markForCheck();
        },
      });
  }

  categoryInfo(code: FinanceCategoryCode): FinanceCategory {
    return this.dictionaries.categories.find((c: FinanceCategory) => c.code === code)
      ?? FINANCE_FALLBACK_DICTIONARIES.categories.find((c: FinanceCategory) => c.code === code)!;
  }

  /** «2 × 89,90 ₽» — только пока сумма позиции сходится с количеством и ценой (после правки суммы подсказка устарела). */
  itemHint(item: ItemDraft): string {
    if (item.quantity === null || item.price === null || item.quantity === 1
      || (item.amountText !== item.originalAmountText && !this.priceMatches(item))) {
      return '';
    }
    return `${String(item.quantity).replace('.', ',')} × ${formatMoney(item.price, this.draft?.currency)}`;
  }

  itemError(item: ItemDraft, field: 'name' | 'amount'): string {
    return this.errors[`${item.key}.${field}`] ?? '';
  }

  /** Enter в полях позиции не должен сохранять чек и уводить со страницы. */
  preventSubmit(event: Event): void {
    event.preventDefault();
  }

  unlockEditing(): void {
    this.editUnlocked = true;
    this.poll?.unsubscribe();
    this.cdr.markForCheck();
  }

  addItem(): void {
    if (!this.draft || this.formDisabled) {
      return;
    }
    this.draft.items.push({
      key: `new-${this.nextKey++}`,
      id: null,
      name: '',
      amountText: '',
      originalAmountText: '',
      quantity: null,
      price: null,
      category: this.draft.category,
    });
    this.cdr.markForCheck();
  }

  removeItem(item: ItemDraft): void {
    if (!this.draft || this.formDisabled) {
      return;
    }
    this.draft.items = this.draft.items.filter((x: ItemDraft) => x !== item);
    delete this.errors[`${item.key}.name`];
    delete this.errors[`${item.key}.amount`];
    this.cdr.markForCheck();
  }

  useItemsTotal(): void {
    if (this.draft && !this.formDisabled && this.itemsTotal > 0) {
      this.draft.totalText = moneyInput(Math.round(this.itemsTotal * 100) / 100);
      this.cdr.markForCheck();
    }
  }

  togglePhoto(): void {
    this.photoExpanded = !this.photoExpanded;
  }

  save(): void {
    if (!this.draft || this.saving || this.deleting) {
      return;
    }

    const request: FinanceReceiptUpdateRequest | null = this.validate();
    if (!request) {
      this.cdr.markForCheck();
      this.revealFirstError();
      return;
    }

    this.saving = true;
    this.cdr.markForCheck();
    this.api.updateReceipt(this.receiptId, request)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.unsubscribe$),
      )
      .subscribe({
        next: (receipt: FinanceReceipt) => {
          const previousMonth: string | undefined = this.receipt?.purchasedOn.slice(0, 7);
          this.apply(receipt);
          const month: string = receipt.purchasedOn.slice(0, 7);
          this.toast.success(previousMonth && previousMonth !== month
            ? `Чек сохранён и учтён в ${monthPrepositional(month)}`
            : 'Чек сохранён');
          this.leave(receipt.purchasedOn);
        },
        error: (response: { status?: number; error?: { details?: { field?: string; message?: string }[]; message?: string } }) => {
          if (response?.status === 404) {
            this.toast.error('Чек уже удалён');
            this.leave();
            return;
          }
          this.applyServerErrors(response?.error?.details);
          this.cdr.markForCheck();
          this.revealFirstError(false);
          this.toast.error(response?.error?.details?.[0]?.message || response?.error?.message || 'Не удалось сохранить чек');
        },
      });
  }

  recognizeAgain(): void {
    if (!this.canRecognizeAgain || this.recognizing) {
      return;
    }
    if (this.isDirty() && !window.confirm('Несохранённые правки пропадут. Распознать чек заново?')) {
      return;
    }

    this.recognizing = true;
    this.cdr.markForCheck();
    this.api.recognizeAgain(this.receiptId)
      .pipe(
        finalize(() => {
          this.recognizing = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.unsubscribe$),
      )
      .subscribe({
        next: (receipt: FinanceReceipt) => {
          this.editUnlocked = false;
          this.apply(receipt);
        },
        error: (response: { error?: { message?: string } }) => {
          this.toast.error(response?.error?.message || 'Не удалось запустить распознавание');
        },
      });
  }

  remove(): void {
    if (this.deleting || this.saving || !window.confirm('Удалить чек? Его сумма пропадёт из расходов.')) {
      return;
    }

    this.deleting = true;
    this.cdr.markForCheck();
    this.api.deleteReceipt(this.receiptId)
      .pipe(
        finalize(() => {
          this.deleting = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.unsubscribe$),
      )
      .subscribe({
        next: () => {
          this.toast.success('Чек удалён');
          this.leave();
        },
        error: (response: { status?: number }) => {
          if (response?.status === 404) {
            this.leave();
            return;
          }
          this.toast.error('Не удалось удалить чек');
        },
      });
  }

  /** «gpt://<каталог>/qwen3.6-35b-a3b» → «qwen3.6-35b-a3b»: каталог Yandex пользователю не нужен. */
  modelLabel(model: string): string {
    return model.includes('://') ? model.slice(model.lastIndexOf('/') + 1) : model;
  }

  trackByCode(_: number, currency: { code: string }): string {
    return currency.code;
  }

  trackByKey(_: number, item: ItemDraft): string {
    return item.key;
  }

  private apply(receipt: FinanceReceipt): void {
    // Пока пользователь правит форму, новые данные с сервера её не затирают.
    const keepDraft: boolean = !!this.draft && this.isDirty() && receipt.status === this.receipt?.status;
    this.receipt = receipt;
    if (!keepDraft) {
      this.draft = this.toDraft(receipt);
      this.currencies = KNOWN_CURRENCIES.some((c) => c.code === receipt.currency)
        ? KNOWN_CURRENCIES
        : [...KNOWN_CURRENCIES, {code: receipt.currency, name: receipt.currency}];
      this.snapshot = this.serialize();
      this.errors = {};
    }
    this.cdr.markForCheck();

    if (receipt.status === 'PENDING' && !this.editUnlocked) {
      this.startPolling();
    } else {
      this.poll?.unsubscribe();
    }
  }

  private startPolling(): void {
    this.poll?.unsubscribe();
    this.pollTimedOut = false;
    const startedAt: number = Date.now();
    this.poll = timer(3000, 3000)
      .pipe(
        takeWhile(() => {
          if (Date.now() - startedAt < PENDING_POLL_LIMIT_MS) {
            return true;
          }
          this.pollTimedOut = true;
          this.cdr.markForCheck();
          return false;
        }),
        filter((tick: number) => Date.now() - startedAt < PENDING_POLL_FAST_MS || tick % 5 === 0),
        // exhaustMap: медленный ответ не отменяется следующим тиком. Ошибка одного запроса (сеть, 502) — не конец опроса.
        exhaustMap(() => this.api.getReceipt(this.receiptId).pipe(
          catchError((response: { status?: number }) => of(response?.status === 404 ? 'deleted' as const : null)),
        )),
        takeUntil(this.unsubscribe$),
      )
      .subscribe((result: FinanceReceipt | 'deleted' | null) => {
        if (result === 'deleted') {
          this.poll?.unsubscribe();
          this.loadError = 'Чек не найден — возможно, его уже удалили';
          this.receipt = null;
          this.draft = null;
          this.cdr.markForCheck();
          return;
        }
        if (result && result.status !== 'PENDING' && !this.editUnlocked) {
          this.apply(result);
        }
      });
  }

  private loadPhoto(): void {
    this.api.getImageBlob(this.receiptId)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (blob: Blob) => {
          this.photoUrl = URL.createObjectURL(blob);
          this.cdr.markForCheck();
        },
        error: () => {
          this.photoError = true;
          this.cdr.markForCheck();
        },
      });
  }

  private toDraft(receipt: FinanceReceipt): ReceiptDraft {
    return {
      purchasedOn: receipt.purchasedOn,
      currency: receipt.currency,
      store: receipt.store ?? '',
      totalText: receipt.status === 'READY' || receipt.total > 0 ? moneyInput(receipt.total) : '',
      category: receipt.category,
      note: receipt.note ?? '',
      items: (receipt.items ?? []).map((item: FinanceReceiptItem) => ({
        key: item.id,
        id: item.id,
        name: item.name,
        amountText: moneyInput(item.amount),
        originalAmountText: moneyInput(item.amount),
        quantity: item.quantity,
        price: item.price,
        category: item.category,
      })),
    };
  }

  private validate(): FinanceReceiptUpdateRequest | null {
    const draft: ReceiptDraft = this.draft!;
    const errors: Record<string, string> = {};

    const total: number | null = parseMoney(draft.totalText);
    if (total === null || total < 0.01 || total > 10_000_000) {
      errors['total'] = 'Укажите сумму чека';
    }
    if (!isValidPurchaseDate(draft.purchasedOn)) {
      errors['purchasedOn'] = 'Укажите дату не позже сегодняшней';
    }
    if (draft.store.trim().length > 120) {
      errors['store'] = 'Не длиннее 120 символов';
    }
    if (draft.note.trim().length > 500) {
      errors['note'] = 'Не длиннее 500 символов';
    }

    // Ошибки позиций — по локальному ключу, а не по индексу: после удаления позиции подсветка не съезжает.
    const items = draft.items.map((item: ItemDraft) => {
      const amount: number | null = parseMoney(item.amountText);
      if (!item.name.trim()) {
        errors[`${item.key}.name`] = 'Название';
      } else if (item.name.trim().length > 200) {
        errors[`${item.key}.name`] = 'Не длиннее 200 символов';
      }
      if (amount === null || amount === 0 || Math.abs(amount) > 10_000_000) {
        errors[`${item.key}.amount`] = 'Сумма';
      }
      // Скидка или весовой товар — сумма и так не равна количеству × цену; трогаем, только если сумму правили.
      const keepPrice: boolean = item.amountText === item.originalAmountText || this.priceMatches(item);
      return {
        id: item.id,
        name: item.name.trim(),
        // Сумму поправили руками — цена из чека больше не про эту позицию.
        quantity: keepPrice ? item.quantity : null,
        price: keepPrice ? item.price : null,
        amount: amount ?? 0,
        category: item.category,
      };
    });

    this.errors = errors;
    if (Object.keys(errors).length) {
      return null;
    }

    return {
      purchasedOn: draft.purchasedOn,
      store: draft.store.trim() || null,
      total: total!,
      currency: draft.currency,
      category: draft.category,
      note: draft.note.trim() || null,
      items,
    };
  }

  /** Ошибки сервера: поля позиций приходят как items[i].field — переводим индекс в ключ позиции. */
  private applyServerErrors(details: { field?: string; message?: string }[] | undefined): void {
    const errors: Record<string, string> = {};
    for (const detail of details ?? []) {
      if (!detail.field) {
        continue;
      }
      const match: RegExpMatchArray | null = detail.field.match(/^items\[(\d+)\]\.(\w+)$/);
      const item: ItemDraft | undefined = match ? this.draft?.items[Number(match[1])] : undefined;
      errors[item ? `${item.key}.${match![2]}` : detail.field] = detail.message ?? 'Ошибка';
    }
    this.errors = errors;
  }

  /** Кнопка «Сохранить» внизу, ошибка может быть высоко: прокручиваем к первому полю с ошибкой и ставим фокус. */
  private revealFirstError(withToast: boolean = true): void {
    if (withToast) {
      this.toast.error('Проверьте выделенные поля');
    }
    setTimeout(() => {
      const field: HTMLElement | null = this.host.nativeElement.querySelector('[aria-invalid="true"]');
      field?.scrollIntoView({behavior: 'smooth', block: 'center'});
      field?.focus({preventScroll: true});
    });
  }

  private priceMatches(item: ItemDraft): boolean {
    const amount: number | null = parseMoney(item.amountText);
    return item.quantity !== null && item.price !== null && amount !== null
      && Math.abs(Math.round(item.quantity * item.price * 100) - Math.round(amount * 100)) <= 1;
  }

  private isDirty(): boolean {
    return !!this.draft && this.serialize() !== this.snapshot;
  }

  private serialize(): string {
    const draft: ReceiptDraft | null = this.draft;
    if (!draft) {
      return '';
    }
    return JSON.stringify({...draft, items: draft.items.map(({key, ...rest}: ItemDraft) => rest)});
  }

  /** Назад к списку: по истории, а если чек открыли по прямой ссылке — к месяцу чека. */
  private leave(purchasedOn?: string): void {
    this.skipGuard = true;
    const navigationId: number = (this.location.getState() as { navigationId?: number } | null)?.navigationId ?? 1;
    if (navigationId > 1) {
      this.location.back();
      return;
    }
    const month: string | undefined = (purchasedOn ?? this.receipt?.purchasedOn)?.slice(0, 7);
    this.router.navigate(['/finance'], {queryParams: month ? {month} : {}, replaceUrl: true});
  }
}
