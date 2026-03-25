import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NgClass, NgForOf } from '@angular/common';
import { ToastMessage, ToastService } from '../../services/toast.service';
import { BaseComponent } from '../../../components/base/base.component';
import { takeUntil } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [
    NgForOf,
    NgClass,
  ],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent extends BaseComponent implements OnInit {
  constructor(
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {
    super();
  }

  toasts: ToastMessage[] = [];

  ngOnInit(): void {
    this.toastService.toasts$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (toasts: ToastMessage[]) => {
          this.toasts = toasts;
          this.cdr.markForCheck();
        },
      });
  }

  remove(toastId: string): void {
    this.toastService.remove(toastId);
  }

  trackByToastId(_: number, toast: ToastMessage): string {
    return toast.id;
  }
}
