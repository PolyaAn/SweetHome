import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, HostListener, Inject, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { finalize, switchMap, throwError } from 'rxjs';
import { Book, BOOK_STATUSES, BookUpsert } from '../models/book.model';
import { BooksApiService } from '../services/books-api.service';

type BookEditorData = Book | { progressBook: Book } | null;
export type BookEditorResult = Book | 'deleted';

@Component({
  selector: 'app-book-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './book-editor.component.html',
  styleUrl: './book-editor.component.scss',
})
export class BookEditorComponent {
  @ViewChild('form') form?: NgForm;
  @ViewChild('discardNotice') set discardNotice(element: ElementRef<HTMLElement> | undefined) {
    if (element) { element.nativeElement.scrollIntoView({ block: 'nearest' }); element.nativeElement.focus(); }
  }
  @ViewChild('deleteNotice') set deleteNotice(element: ElementRef<HTMLElement> | undefined) {
    if (element) {
      element.nativeElement.scrollIntoView({ block: 'nearest' });
      element.nativeElement.focus();
    }
  }
  private readonly destroyRef = inject(DestroyRef);
  readonly statuses = BOOK_STATUSES;
  readonly editing: boolean;
  readonly progressOnly: boolean;
  readonly book: BookUpsert;
  readonly original: Book | null;
  saving = false;
  deleting = false;
  confirmDelete = false;
  error = '';
  submitted = false;
  confirmDiscard = false;
  sessionExpired = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) data: BookEditorData,
    private readonly api: BooksApiService,
    readonly dialog: MatDialogRef<BookEditorComponent, BookEditorResult>,
  ) {
    this.progressOnly = !!data && 'progressBook' in data;
    const book = data && 'progressBook' in data ? data.progressBook : data;
    this.original = book;
    this.editing = !!book;
    this.book = book ? {
      title: book.title, author: book.author, genre: book.genre, status: book.status,
      totalPages: book.totalPages, pagesRead: book.pagesRead, rating: book.rating, notes: book.notes,
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
    if (this.busy) return;
    if (this.confirmDelete) { this.confirmDelete = false; return; }
    if (this.confirmDiscard) { this.confirmDiscard = false; return; }
    if (this.form?.dirty) this.confirmDiscard = true;
    else this.dialog.close();
  }

  get busy(): boolean { return this.saving || this.deleting; }

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
    if (this.busy || this.confirmDelete || form.invalid || this.pagesInvalid || this.progressInvalid || !this.book.title.trim() || !this.book.author.trim()) return;
    this.saving = true;
    this.confirmDiscard = false;
    this.error = '';
    this.sessionExpired = false;
    const payload = { ...this.book, title: this.book.title.trim(), author: this.book.author.trim() };
    if (payload.status === 'COMPLETED' && payload.totalPages !== null) payload.pagesRead = payload.totalPages;
    const id = this.original?.id;
    const request = this.progressOnly && id
      ? this.api.get(id).pipe(switchMap(latest => {
          if (latest.status !== 'READING' || (latest.totalPages !== null && payload.pagesRead > latest.totalPages)) {
            return throwError(() => new HttpErrorResponse({ status: 409 }));
          }
          const { title, author, genre, status, totalPages, rating, notes } = latest;
          return this.api.save({ title, author, genre, status, totalPages, rating, notes, pagesRead: payload.pagesRead }, id);
        }))
      : this.api.save(payload, id);
    request.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.saving = false; }),
    ).subscribe({
      next: result => this.dialog.close(result),
      error: (error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.sessionExpired = true;
          this.error = 'Сессия завершилась. Войдите в новой вкладке, затем повторите сохранение. Изменения остаются в форме.';
        }
        else if (error.status === 404) this.error = 'Книга уже удалена. Закройте окно и обновите библиотеку.';
        else if (error.status === 409 && this.progressOnly) this.error = 'Статус или объём книги изменился. Закройте окно и обновите библиотеку.';
        else {
          const errors: Record<string, string[]> | undefined = error.error?.errors;
          this.error = errors ? Object.values(errors).flat().join(' ') : 'Не удалось сохранить книгу. Проверьте соединение и попробуйте ещё раз.';
        }
      },
    });
  }

  remove(): void {
    if (!this.original || this.progressOnly || !this.confirmDelete || this.busy) return;
    this.deleting = true;
    this.error = '';
    this.sessionExpired = false;
    this.api.delete(this.original.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.deleting = false; }),
    ).subscribe({
      next: () => this.dialog.close('deleted'),
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) { this.dialog.close('deleted'); return; }
        this.sessionExpired = error.status === 401;
        this.error = this.sessionExpired
          ? 'Сессия завершилась. Войдите в новой вкладке и повторите удаление.'
          : 'Не удалось удалить книгу. Попробуйте ещё раз.';
      },
    });
  }
}
