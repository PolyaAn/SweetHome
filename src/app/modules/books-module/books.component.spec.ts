import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { EMPTY, Subject, of, throwError } from 'rxjs';
import { BooksComponent } from './books.component';
import { BookEditorComponent } from './components/book-editor.component';
import { BookList } from './models/book.model';
import { BooksApiService } from './services/books-api.service';

const emptyList: BookList = {
  items: [], page: 1, pageSize: 24, total: 0, hasNext: false,
  stats: { total: 0, reading: 0, completed: 0, wantToRead: 0, onHold: 0, dropped: 0, pagesRead: 12345 },
};

describe('Books library', () => {
  let api: jasmine.SpyObj<BooksApiService>;
  let fixture: ComponentFixture<BooksComponent>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<BooksApiService>('BooksApiService', ['list', 'save', 'delete']);
    api.list.and.returnValue(of(emptyList));
    await TestBed.configureTestingModule({
      imports: [BooksComponent, NoopAnimationsModule],
      providers: [{ provide: BooksApiService, useValue: api }],
    }).compileComponents();
    fixture = TestBed.createComponent(BooksComponent);
    fixture.detectChanges();
  });

  it('renders Russian page counts without requiring Angular locale registration', () => {
    expect(fixture.nativeElement.textContent).toContain('12 345');
  });

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
