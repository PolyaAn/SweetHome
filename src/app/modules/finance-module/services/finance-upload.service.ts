import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, timeout } from 'rxjs';
import { ToastService } from '../../../shared/services/toast.service';
import { FinanceReceipt } from '../models/finance.model';
import { localIsoDate } from '../utils/finance-format';
import { prepareReceiptImage } from '../utils/receipt-image';
import { FinanceApiService } from './finance-api.service';

/**
 * Загрузка фото чека живёт дольше страницы списка: пользователь может уйти и вернуться, пока фото отправляется.
 * Состояние «идёт загрузка» и результат видны любому экземпляру списка; тост показывается один раз — здесь.
 */
const UPLOAD_TIMEOUT_MS = 120_000;

@Injectable()
export class FinanceUploadService {
  readonly uploading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  readonly uploaded$: Subject<FinanceReceipt> = new Subject<FinanceReceipt>();

  /**
   * Результат, который ещё не забрал ни один экземпляр списка (ответ пришёл, пока пользователь был на другой странице).
   * Новый список забирает его при открытии — поведение не зависит от того, где пользователь был в момент ответа.
   */
  private undelivered: FinanceReceipt | null = null;

  constructor(
    private api: FinanceApiService,
    private toast: ToastService,
  ) {
  }

  /** Забрать результат, пришедший без открытого списка (один раз). */
  takeUndelivered(): FinanceReceipt | null {
    const receipt: FinanceReceipt | null = this.undelivered;
    this.undelivered = null;
    return receipt;
  }

  async upload(file: File): Promise<void> {
    if (this.uploading$.value) {
      return;
    }
    this.uploading$.next(true);

    let blob: Blob;
    try {
      blob = await prepareReceiptImage(file);
    } catch (error) {
      this.uploading$.next(false);
      this.toast.error(error instanceof Error ? error.message : 'Не удалось обработать фото');
      return;
    }

    // Без таймаута зависший запрос (смена сети на телефоне) заблокировал бы кнопку до перезагрузки страницы.
    this.api.uploadReceipt(blob, localIsoDate()).pipe(timeout(UPLOAD_TIMEOUT_MS)).subscribe({
      next: (receipt: FinanceReceipt) => {
        if (receipt.status === 'PENDING') {
          this.toast.success('Чек загружен — распознаём сумму и категории');
        } else {
          this.toast.warning('Фото сохранено. Распознавание недоступно — введите сумму вручную');
        }
        this.uploading$.next(false);
        this.undelivered = this.uploaded$.observed ? null : receipt;
        this.uploaded$.next(receipt);
      },
      error: (response: { error?: { details?: { message?: string }[]; message?: string } }) => {
        this.uploading$.next(false);
        this.toast.error(response?.error?.details?.[0]?.message || response?.error?.message
          || (response instanceof Error && response.name === 'TimeoutError'
            ? 'Сервер долго не отвечает — проверьте, появился ли чек, прежде чем загружать снова'
            : 'Не удалось загрузить чек'));
      },
    });
  }
}
