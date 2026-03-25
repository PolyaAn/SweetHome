import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  text: string;
  durationMs: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  readonly toasts$: BehaviorSubject<ToastMessage[]> = new BehaviorSubject<ToastMessage[]>([]);

  success(text: string, durationMs: number = 3000): void {
    this.push('success', text, durationMs);
  }

  error(text: string, durationMs: number = 3500): void {
    this.push('error', text, durationMs);
  }

  warning(text: string, durationMs: number = 3200): void {
    this.push('warning', text, durationMs);
  }

  remove(toastId: string): void {
    this.toasts$.next(this.toasts$.value.filter((toast: ToastMessage) => toast.id !== toastId));
  }

  private push(type: ToastType, text: string, durationMs: number): void {
    const toast: ToastMessage = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      type,
      text,
      durationMs,
    };

    this.toasts$.next([...this.toasts$.value, toast]);
    setTimeout(() => this.remove(toast.id), durationMs);
  }
}
