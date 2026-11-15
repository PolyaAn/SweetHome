import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { ToastService } from '../../../shared/services/toast.service';
import { FinanceReceipt } from '../models/finance.model';
import { localIsoDate } from '../utils/finance-format';
import { prepareReceiptImage } from '../utils/receipt-image';
import { FinanceApiService } from './finance-api.service';

/**
 * Загрузка фото чека живёт дольше страницы списка: пользователь может уйти и вернуться, пока фото отправляется.
 * Состояние «идёт загрузка» и результат видны любому экземпляру списка; тост показывается один раз — здесь.
 */
@Injectable()
export class FinanceUploadService {
  readonly uploading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  readonly uploaded$: Subject<FinanceReceipt> = new Subject<FinanceReceipt>();

  constructor(
    private api: FinanceApiService,
    private toast: ToastService,
  ) {
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

    this.api.uploadReceipt(blob, localIsoDate()).subscribe({
      next: (receipt: FinanceReceipt) => {
        if (receipt.status === 'PENDING') {
          this.toast.success('Чек загружен — распознаём сумму и категории');
        } else {
          this.toast.warning('Фото сохранено. Распознавание недоступно — введите сумму вручную');
        }
        this.uploading$.next(false);
        this.uploaded$.next(receipt);
      },
      error: (response: { error?: { details?: { message?: string }[]; message?: string } }) => {
        this.uploading$.next(false);
        this.toast.error(response?.error?.details?.[0]?.message || response?.error?.message || 'Не удалось загрузить чек');
      },
    });
  }
}
