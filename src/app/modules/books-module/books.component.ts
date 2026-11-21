import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { afterNextRender, ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { CdkPortal } from '@angular/cdk/portal';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { EMPTY, Subject, catchError, debounceTime, finalize, map, of, startWith, switchMap } from 'rxjs';
import { Book, BOOK_STATUSES, BookSort, BookStats, BookStatus } from './models/book.model';
import { BooksApiService } from './services/books-api.service';
import { BookEditorComponent, BookEditorResult } from './components/book-editor.component';
import { BOOK_PALETTES, BookArtDirective } from './components/book-art.directive';
import { SharedService } from '../../shared/services/shared.service';

const EMPTY_STATS: BookStats = { total: 0, wantToRead: 0, reading: 0, completed: 0, onHold: 0, dropped: 0, pagesRead: 0 };

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, BookArtDirective, CdkPortal],
  templateUrl: './books.component.html',
  styleUrl: './books.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BooksComponent implements OnInit {
  @ViewChild(CdkPortal, { static: true }) private headerActions!: CdkPortal;
  @ViewChild('catalog', { static: true }) private catalog!: ElementRef<HTMLElement>;
  @ViewChild('statsDialog', { static: true }) private statsDialog!: TemplateRef<unknown>;
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<void>();
  private readonly searches = new Subject<string>();
  private readonly featuredRequests = new Subject<number>();
  private editorRef: MatDialogRef<BookEditorComponent, BookEditorResult> | null = null;
  private statsRef: MatDialogRef<unknown> | null = null;
  private refreshFeatured = true;
  readonly statuses = BOOK_STATUSES;
  readonly palettes = BOOK_PALETTES;
  books: Book[] = [];
  featured: Book | null = null;
  stats: BookStats = EMPTY_STATS;
  query = '';
  status: BookStatus | '' = '';
  sortBy: BookSort = 'UPDATED_AT';
  page = 1;
  total = 0;
  hasNext = false;
  loading = true;
  loaded = false;
  error = '';
  featuredError = false;
  notice = '';

  constructor(private readonly api: BooksApiService, private readonly dialog: MatDialog, private readonly cdr: ChangeDetectorRef) {
    const outlet = inject(SharedService).headerActions$;
    afterNextRender(() => outlet.next(this.headerActions));
    this.destroyRef.onDestroy(() => {
      if (outlet.value === this.headerActions) outlet.next(null);
    });
  }

  ngOnInit(): void {
    this.searches.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.filter());
    this.featuredRequests.pipe(
      switchMap(readingCount => {
        this.featuredError = false;
        if (!readingCount) return of(null);
        return this.api.latestReading().pipe(
          map(reading => reading.items[0] ?? null),
          catchError((error: HttpErrorResponse) => {
            if (error.status === 401) this.failList(error);
            else this.featuredError = true;
            return of(null);
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(book => {
      this.featured = book;
      this.cdr.markForCheck();
    });
    this.requests.pipe(
      startWith(undefined),
      switchMap(() => {
        this.loading = true;
        this.error = '';
        this.cdr.markForCheck();
        const { query, status, sortBy, page } = this;
        return this.api.list(query, status, sortBy, page).pipe(
          switchMap(result => {
            if (page <= 1 || result.items.length) return of(result);
            this.page = Math.max(1, Math.ceil(result.total / result.pageSize));
            return this.page === page ? of(result) : this.api.list(query, status, sortBy, this.page);
          }),
          catchError((error: HttpErrorResponse) => {
            this.featuredRequests.next(0);
            this.failList(error);
            return EMPTY;
          }),
          finalize(() => { this.loading = false; this.cdr.markForCheck(); }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => {
      const updateFeatured = this.refreshFeatured || this.stats.reading !== result.stats.reading;
      this.books = result.items;
      this.stats = result.stats;
      this.total = result.total;
      this.hasNext = result.hasNext;
      this.loaded = true;
      if (updateFeatured) {
        this.refreshFeatured = false;
        this.featuredRequests.next(result.stats.reading);
      }
      this.cdr.markForCheck();
    });
  }

  private failList(error: HttpErrorResponse): void {
    this.books = [];
    this.loaded = false;
    this.stats = EMPTY_STATS;
    this.total = 0;
    this.hasNext = false;
    this.refreshFeatured = true;
    this.statsRef?.close();
    this.error = error.status === 401
      ? 'Войдите в аккаунт, чтобы открыть свою библиотеку.'
      : 'Не удалось загрузить книги. Проверьте соединение и попробуйте ещё раз.';
  }

  search(value: string): void { this.query = value; this.searches.next(value); }
  filter(): void { this.page = 1; this.requests.next(); }
  selectStatus(status: BookStatus | ''): void { this.status = status; this.filter(); }
  reload(): void { this.refreshFeatured = true; this.requests.next(); }
  reset(): void { this.query = ''; this.status = ''; this.sortBy = 'UPDATED_AT'; this.filter(); }
  changePage(delta: number): void { this.page += delta; this.requests.next(); }
  trackBook(_: number, book: Book): string { return book.id; }
  statusName(status: BookStatus): string { return this.statuses.find(item => item.code === status)?.name ?? status; }
  progress(book: Book): number { return book.totalPages ? Math.min(100, Math.round(book.pagesRead / book.totalPages * 100)) : 0; }
  statusCount(status: BookStatus): number {
    return ({ WANT_TO_READ: this.stats.wantToRead, READING: this.stats.reading, COMPLETED: this.stats.completed, ON_HOLD: this.stats.onHold, DROPPED: this.stats.dropped })[status];
  }

  isDune(book: Book): boolean {
    return ['дюна', 'dune'].includes(book.title.trim().toLowerCase());
  }

  artIndex(book: Book): number {
    if (this.isDune(book)) return 0;
    let hash = 0;
    for (const char of book.id) hash = (Math.imul(31, hash) + char.charCodeAt(0)) >>> 0;
    return hash % this.palettes.length;
  }

  openStats(): void {
    if (this.statsRef) return;
    this.statsRef = this.dialog.open(this.statsDialog, {
      width: '480px', maxWidth: 'calc(100vw - 24px)', ariaLabel: 'Статистика библиотеки',
    });
    this.statsRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.statsRef = null;
    });
  }

  edit(book?: Book, progressOnly = false): void {
    if (this.editorRef) return;
    this.editorRef = this.dialog.open(BookEditorComponent, {
      data: progressOnly && book ? { progressBook: book } : book ?? null,
      width: progressOnly ? '440px' : '560px',
      maxWidth: 'calc(100vw - 24px)', autoFocus: progressOnly ? '[name="pagesRead"]' : '[name="title"]',
      disableClose: true, closeOnNavigation: false,
      ariaLabel: progressOnly ? 'Отметить страницу' : book ? 'Карточка книги' : 'Добавить книгу',
    });
    this.editorRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(result => {
      this.editorRef = null;
      if (!result) return;
      if (!progressOnly) this.catalog.nativeElement.focus({ preventScroll: true });
      this.notice = result === 'deleted' ? 'Книга удалена.' : progressOnly ? 'Прогресс сохранён.' : 'Книга сохранена.';
      if (!book) {
        this.refreshFeatured = true;
        this.reset();
      } else {
        this.reload();
      }
    });
  }

  canDeactivate(): boolean {
    this.statsRef?.close();
    if (!this.editorRef) return true;
    const editor = this.editorRef.componentInstance;
    if (editor.busy || editor.form?.dirty) { editor.requestClose(); return false; }
    this.editorRef.close();
    return true;
  }
}
