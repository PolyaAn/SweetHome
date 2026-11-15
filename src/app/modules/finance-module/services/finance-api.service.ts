import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  FINANCE_FALLBACK_DICTIONARIES,
  FinanceCategoryCode,
  FinanceDictionaries,
  FinanceManualReceiptRequest,
  FinanceReceipt,
  FinanceReceiptList,
  FinanceReceiptUpdateRequest,
  FinanceSummary,
} from '../models/finance.model';

@Injectable()
export class FinanceApiService {
  private readonly baseUrl: string = `${environment.apiHost}/api/v1/finance`;
  private dictionaries$?: Observable<FinanceDictionaries>;

  constructor(private http: HttpClient) {
  }

  getDictionaries(): Observable<FinanceDictionaries> {
    if (!this.dictionaries$) {
      this.dictionaries$ = this.http.get<FinanceDictionaries>(`${this.baseUrl}/dictionaries`, {withCredentials: true}).pipe(
        map((response: FinanceDictionaries) => ({
          categories: response.categories?.length ? response.categories : FINANCE_FALLBACK_DICTIONARIES.categories,
          recognition: !!response.recognition,
        })),
        catchError(() => {
          this.dictionaries$ = undefined;
          return of(FINANCE_FALLBACK_DICTIONARIES);
        }),
        shareReplay(1),
      );
    }

    return this.dictionaries$;
  }

  getSummary(month: string): Observable<FinanceSummary> {
    return this.http.get<FinanceSummary>(`${this.baseUrl}/summary`, {params: {month}, withCredentials: true});
  }

  getReceipts(month: string, category: FinanceCategoryCode | null): Observable<FinanceReceiptList> {
    let params: HttpParams = new HttpParams().set('month', month);
    if (category) {
      params = params.set('category', category);
    }
    return this.http.get<FinanceReceiptList>(`${this.baseUrl}/receipts`, {params, withCredentials: true});
  }

  getReceipt(receiptId: string): Observable<FinanceReceipt> {
    return this.http.get<FinanceReceipt>(`${this.baseUrl}/receipts/${encodeURIComponent(receiptId)}`, {withCredentials: true});
  }

  uploadReceipt(file: Blob, purchasedOn: string, fileName: string = 'receipt.jpg'): Observable<FinanceReceipt> {
    const form: FormData = new FormData();
    form.append('file', file, fileName);
    form.append('purchasedOn', purchasedOn);
    return this.http.post<FinanceReceipt>(`${this.baseUrl}/receipts`, form, {withCredentials: true});
  }

  createManualReceipt(payload: FinanceManualReceiptRequest): Observable<FinanceReceipt> {
    return this.http.post<FinanceReceipt>(`${this.baseUrl}/receipts/manual`, payload, {withCredentials: true});
  }

  updateReceipt(receiptId: string, payload: FinanceReceiptUpdateRequest): Observable<FinanceReceipt> {
    return this.http.put<FinanceReceipt>(`${this.baseUrl}/receipts/${encodeURIComponent(receiptId)}`, payload, {withCredentials: true});
  }

  deleteReceipt(receiptId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/receipts/${encodeURIComponent(receiptId)}`, {withCredentials: true});
  }

  recognizeAgain(receiptId: string): Observable<FinanceReceipt> {
    return this.http.post<FinanceReceipt>(`${this.baseUrl}/receipts/${encodeURIComponent(receiptId)}/recognize`, {}, {withCredentials: true});
  }

  getImageBlob(receiptId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/receipts/${encodeURIComponent(receiptId)}/image`, {
      responseType: 'blob',
      withCredentials: true,
    });
  }
}
