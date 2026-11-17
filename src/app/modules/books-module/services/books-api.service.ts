import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Book, BookList, BookSort, BookStatus, BookUpsert } from '../models/book.model';

@Injectable({ providedIn: 'root' })
export class BooksApiService {
  private readonly url = `${environment.apiHost}/api/v1/books`;

  constructor(private readonly http: HttpClient) {}

  list(query: string, status: BookStatus | '', sortBy: BookSort, page: number): Observable<BookList> {
    let params = new HttpParams().set('page', page).set('pageSize', 24).set('sortBy', sortBy);
    if (query.trim()) params = params.set('query', query.trim());
    if (status) params = params.set('status', status);
    return this.http.get<BookList>(this.url, { params, withCredentials: true });
  }

  save(book: BookUpsert, id?: string): Observable<Book> {
    return id
      ? this.http.put<Book>(`${this.url}/${encodeURIComponent(id)}`, book, { withCredentials: true })
      : this.http.post<Book>(this.url, book, { withCredentials: true });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${encodeURIComponent(id)}`, { withCredentials: true });
  }
}
