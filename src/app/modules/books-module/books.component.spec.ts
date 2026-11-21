import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { OverlayContainer } from '@angular/cdk/overlay';
import { EMPTY, Subject, of, throwError } from 'rxjs';
import { BooksComponent } from './books.component';
import { BookEditorComponent } from './components/book-editor.component';
import { Book, BookList } from './models/book.model';
import { BooksApiService } from './services/books-api.service';

const emptyList: BookList = {
  items: [], page: 1, pageSize: 24, total: 0, hasNext: false,
  stats: { total: 0, reading: 0, completed: 0, wantToRead: 0, onHold: 0, dropped: 0, pagesRead: 12345 },
};
const readingBook: Book = {
  id: 'book-1', title: 'Дюна', author: 'Фрэнк Герберт', genre: null, notes: null, status: 'READING',
  pagesRead: 12, totalPages: 120, rating: null, createdAt: '', updatedAt: '',
};

describe('Books library', () => {
  let api: jasmine.SpyObj<BooksApiService>;
  let fixture: ComponentFixture<BooksComponent>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<BooksApiService>('BooksApiService', ['list', 'latestReading', 'get', 'save', 'delete']);
    api.list.and.returnValue(of(emptyList));
    await TestBed.configureTestingModule({
      imports: [BooksComponent, NoopAnimationsModule],
      providers: [{ provide: BooksApiService, useValue: api }],
    }).compileComponents();
    fixture = TestBed.createComponent(BooksComponent);
    fixture.detectChanges();
  });

  it('renders Russian page counts without requiring Angular locale registration', () => {
    fixture.componentInstance.openStats();
    fixture.detectChanges();
    expect(TestBed.inject(OverlayContainer).getContainerElement().textContent).toContain('12 345');
  });

  it('uses the whole library to find the current book and preserves it on an empty shelf', () => {
    const readingList = { ...emptyList, items: [readingBook], stats: { ...emptyList.stats, total: 1, reading: 1 } };
    api.list.and.returnValue(of(readingList));
    api.latestReading.and.returnValue(of(readingList));
    const component = fixture.componentInstance;
    component.reload();
    api.list.and.returnValue(of({ ...readingList, items: [] }));
    component.selectStatus('COMPLETED');
    fixture.detectChanges();
    expect(component.featured).toEqual(readingBook);
    expect(api.latestReading).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('Отметить страницу');
    expect(fixture.nativeElement.textContent).toContain('Книги не найдены');
  });

  it('clears the featured book and library statistics after a failed list request', () => {
    const readingList = { ...emptyList, items: [readingBook], stats: { ...emptyList.stats, total: 1, reading: 1 } };
    api.list.and.returnValue(of(readingList));
    api.latestReading.and.returnValue(of(readingList));
    const component = fixture.componentInstance;
    component.reload();
    api.list.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    component.reload();
    expect(component.loaded).toBeFalse();
    expect(component.featured).toBeNull();
    expect(component.stats.total).toBe(0);
  });

  it('saves quick progress against the latest editable book data', fakeAsync(() => {
    api.get.and.returnValue(of({ ...readingBook, notes: 'Изменено в другой вкладке' }));
    api.save.and.returnValue(of({ ...readingBook, pagesRead: 15 }));
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    fixture.componentInstance.edit(readingBook, true);
    fixture.detectChanges();
    tick();
    const input = overlay.querySelector<HTMLInputElement>('input[name="pagesRead"]')!;
    expect(input.value).toBe('12');
    expect(overlay.querySelectorAll('input').length).toBe(1);
    input.value = '15';
    input.dispatchEvent(new Event('input'));
    overlay.querySelector('form')!.dispatchEvent(new Event('submit'));
    flush();
    expect(api.get).toHaveBeenCalledOnceWith(readingBook.id);
    expect(api.save).toHaveBeenCalledOnceWith({
      title: readingBook.title, author: readingBook.author, genre: null, notes: 'Изменено в другой вкладке',
      status: 'READING', pagesRead: 15, totalPages: 120, rating: null,
    }, readingBook.id);
  }));

  it('repeats a previous search after filters are reset', fakeAsync(() => {
    const component = fixture.componentInstance;
    component.search('Дюна'); tick(301);
    component.reset();
    component.search('Дюна'); tick(301);
    expect(api.list.calls.mostRecent().args).toEqual(['Дюна', '', 'UPDATED_AT', 1]);
    expect(api.list.calls.count()).toBe(4);
  }));

  it('ignores a stale response when the user changes the shelf', () => {
    const oldResponse = new Subject<BookList>();
    const currentResponse = new Subject<BookList>();
    api.list.and.returnValues(oldResponse, currentResponse);
    const component = fixture.componentInstance;
    component.reload();
    component.selectStatus('READING');
    currentResponse.next({ ...emptyList, total: 2 });
    oldResponse.next({ ...emptyList, total: 99 });
    expect(component.total).toBe(2);
  });

  it('recovers from a failed request on retry', () => {
    api.list.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const component = fixture.componentInstance;
    component.reload();
    expect(component.error).toBeTruthy();
    api.list.and.returnValue(of(emptyList));
    component.reload();
    expect(component.error).toBe('');
    expect(component.loading).toBeFalse();
  });
});

describe('Book editor', () => {
  let fixture: ComponentFixture<BookEditorComponent>;
  let dialog: { close: jasmine.Spy; backdropClick: () => typeof EMPTY; keydownEvents: () => typeof EMPTY };

  beforeEach(async () => {
    dialog = { close: jasmine.createSpy('close'), backdropClick: () => EMPTY, keydownEvents: () => EMPTY };
    await TestBed.configureTestingModule({
      imports: [BookEditorComponent, NoopAnimationsModule],
      providers: [
        { provide: BooksApiService, useValue: jasmine.createSpyObj('BooksApiService', ['save']) },
        { provide: MAT_DIALOG_DATA, useValue: null },
        { provide: MatDialogRef, useValue: dialog },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BookEditorComponent);
    fixture.detectChanges();
  });

  it('rejects fractional page counts', () => {
    fixture.componentInstance.book.totalPages = 100.5;
    expect(fixture.componentInstance.pagesInvalid).toBeTrue();
  });

  it('ignores stale disabled progress when completing a book with known length', () => {
    const component = fixture.componentInstance;
    component.book.totalPages = 200;
    component.book.pagesRead = Number.NaN;
    component.book.status = 'COMPLETED';
    expect(component.pagesInvalid).toBeFalse();
    expect(component.progressInvalid).toBeFalse();
  });

  it('preserves a dirty draft when the editor is closed', () => {
    const component = fixture.componentInstance;
    component.form?.form.markAsDirty();
    component.requestClose();
    expect(component.confirmDiscard).toBeTrue();
    expect(dialog.close).not.toHaveBeenCalled();
  });
});
