import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { EMPTY, Subject, catchError, debounceTime, finalize, startWith, switchMap } from 'rxjs';
import { Book, BOOK_STATUSES, BookSort, BookStats, BookStatus } from './models/book.model';
import { BooksApiService } from './services/books-api.service';
import { BookEditorComponent } from './components/book-editor.component';

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule],
  templateUrl: './books.component.html',
  styleUrl: './books.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BooksComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<void>();
  private readonly searches = new Subject<string>();
  private editorRef: MatDialogRef<BookEditorComponent, Book> | null = null;
  readonly statuses = BOOK_STATUSES;
  books: Book[] = [];
  stats: BookStats = { total: 0, wantToRead: 0, reading: 0, completed: 0, onHold: 0, dropped: 0, pagesRead: 0 };
  query = '';
  status: BookStatus | '' = '';
  sortBy: BookSort = 'UPDATED_AT';
  page = 1;
  total = 0;
  hasNext = false;
  loading = true;
  loaded = false;
  error = '';
  deletingId: string | null = null;
  confirmingId: string | null = null;

  constructor(private readonly api: BooksApiService, private readonly dialog: MatDialog, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.searches.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.filter());
    this.requests.pipe(
      startWith(undefined),
      switchMap(() => {
        this.loading = true;
        this.error = '';
        this.confirmingId = null;
        this.cdr.markForCheck();
        return this.api.list(this.query, this.status, this.sortBy, this.page).pipe(
          catchError((error: HttpErrorResponse) => {
            this.books = [];
            this.error = error.status === 401 ? 'Войдите в аккаунт, чтобы открыть свою библиотеку.' : 'Не удалось загрузить книги. Проверьте соединение и попробуйте ещё раз.';
            return EMPTY;
          }),
          finalize(() => { this.loading = false; this.cdr.markForCheck(); }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => {
      if (this.page > 1 && !result.items.length) {
        this.page--;
        this.requests.next();
        return;
      }
      this.books = result.items;
      this.stats = result.stats;
      this.total = result.total;
      this.hasNext = result.hasNext;
      this.loaded = true;
      this.cdr.markForCheck();
    });
  }

  search(value: string): void { this.query = value; this.searches.next(value); }
  filter(): void { this.page = 1; this.requests.next(); }
  selectStatus(status: BookStatus | ''): void { this.status = status; this.filter(); }
  reload(): void { this.requests.next(); }
  reset(): void { this.query = ''; this.status = ''; this.filter(); }
  changePage(delta: number): void { this.page += delta; this.requests.next(); }
  trackBook(_: number, book: Book): string { return book.id; }
  statusName(status: BookStatus): string { return this.statuses.find(item => item.code === status)?.name ?? status; }
  progress(book: Book): number { return book.totalPages ? Math.min(100, Math.round(book.pagesRead / book.totalPages * 100)) : 0; }
  statusCount(status: BookStatus): number {
    return ({ WANT_TO_READ: this.stats.wantToRead, READING: this.stats.reading, COMPLETED: this.stats.completed, ON_HOLD: this.stats.onHold, DROPPED: this.stats.dropped })[status];
  }

  edit(book?: Book): void {
    if (this.editorRef) return;
    this.editorRef = this.dialog.open(BookEditorComponent, {
      data: book ?? null, width: '560px', maxWidth: 'calc(100vw - 24px)', autoFocus: 'first-tabbable', disableClose: true, closeOnNavigation: false,
      ariaLabel: book ? 'Редактировать книгу' : 'Добавить книгу',
    });
    this.editorRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(result => {
      this.editorRef = null;
      if (result) this.reload();
    });
  }

  canDeactivate(): boolean {
    if (!this.editorRef) return true;
    const editor = this.editorRef.componentInstance;
    if (editor.saving || editor.form?.dirty) { editor.requestClose(); return false; }
    this.editorRef.close();
    return true;
  }

  remove(book: Book): void {
    if (this.deletingId) return;
    this.deletingId = book.id;
    this.api.delete(book.id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
      this.deletingId = null;
      this.cdr.markForCheck();
    })).subscribe({
      next: () => this.reload(),
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) { this.reload(); return; }
        this.error = 'Не удалось удалить книгу. Попробуйте ещё раз.';
        this.confirmingId = null;
        this.cdr.markForCheck();
      },
    });
  }
}
