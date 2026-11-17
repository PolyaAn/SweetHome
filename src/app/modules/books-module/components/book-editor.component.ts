import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, HostListener, Inject, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { Book, BOOK_STATUSES, BookUpsert } from '../models/book.model';
import { BooksApiService } from '../services/books-api.service';

@Component({
  selector: 'app-book-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule],
  templateUrl: './book-editor.component.html',
  styleUrl: './book-editor.component.scss',
})
export class BookEditorComponent {
  @ViewChild('form') form?: NgForm;
  @ViewChild('discardNotice') set discardNotice(element: ElementRef<HTMLElement> | undefined) {
    if (element) { element.nativeElement.scrollIntoView({ block: 'nearest' }); element.nativeElement.focus(); }
  }
  private readonly destroyRef = inject(DestroyRef);
  readonly statuses = BOOK_STATUSES;
  readonly editing: boolean;
  readonly book: BookUpsert;
  saving = false;
  error = '';
  submitted = false;
  confirmDiscard = false;
  sessionExpired = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: Book | null,
    private readonly api: BooksApiService,
    readonly dialog: MatDialogRef<BookEditorComponent, Book>,
  ) {
    this.editing = !!data;
    this.book = data ? {
      title: data.title, author: data.author, genre: data.genre, status: data.status,
      totalPages: data.totalPages, pagesRead: data.pagesRead, rating: data.rating, notes: data.notes,
    } : {
      title: '', author: '', genre: null, status: 'WANT_TO_READ',
      totalPages: null, pagesRead: 0, rating: null, notes: null,
    };
    this.dialog.backdropClick().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.requestClose());
    this.dialog.keydownEvents().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      if (event.key === 'Escape') { event.preventDefault(); this.requestClose(); }
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.form?.dirty) { event.preventDefault(); event.returnValue = ''; }
  }

  requestClose(): void {
    if (this.saving) return;
    if (this.confirmDiscard) { this.confirmDiscard = false; return; }
    if (this.form?.dirty) this.confirmDiscard = true;
    else this.dialog.close();
  }

  get progressInvalid(): boolean {
    return this.book.status !== 'COMPLETED' && this.book.totalPages !== null && this.book.pagesRead > this.book.totalPages;
  }

  get pagesInvalid(): boolean {
    const autoComplete = this.book.status === 'COMPLETED' && this.book.totalPages !== null;
    return (this.book.totalPages !== null && (!Number.isInteger(this.book.totalPages) || this.book.totalPages < 1 || this.book.totalPages > 100000)) ||
      (!autoComplete && (!Number.isInteger(this.book.pagesRead) || this.book.pagesRead < 0 || this.book.pagesRead > 100000));
  }

  save(form: NgForm): void {
    this.submitted = true;
    if (this.saving || form.invalid || this.pagesInvalid || this.progressInvalid || !this.book.title.trim() || !this.book.author.trim()) return;
    this.saving = true;
    this.confirmDiscard = false;
    this.error = '';
    this.sessionExpired = false;
    const payload = { ...this.book, title: this.book.title.trim(), author: this.book.author.trim() };
    if (payload.status === 'COMPLETED' && payload.totalPages !== null) payload.pagesRead = payload.totalPages;
    this.api.save(payload, this.data?.id).pipe(finalize(() => {
      this.saving = false;
    })).subscribe({
      next: result => this.dialog.close(result),
      error: (error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.sessionExpired = true;
          this.error = 'Сессия завершилась. Войдите в новой вкладке, затем повторите сохранение. Изменения остаются в форме.';
        }
        else if (error.status === 404) this.error = 'Книга уже удалена. Закройте окно и обновите библиотеку.';
        else {
          const errors: Record<string, string[]> | undefined = error.error?.errors;
          this.error = errors ? Object.values(errors).flat().join(' ') : 'Не удалось сохранить книгу. Проверьте соединение и попробуйте ещё раз.';
        }
      },
    });
  }
}
