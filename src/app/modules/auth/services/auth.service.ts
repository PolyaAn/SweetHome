import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, catchError, map, Observable, of, tap } from "rxjs";
import { environment } from "../../../../environments/environment";

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private http: HttpClient,
  ) {
  }

  isAuthenticated$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  login(email: string, password: string): Observable<boolean> {
    return this.http.post(`${environment.apiHost}/Account/Login`, {
      email,
      password,
    }).pipe(
      map(() => true),
      catchError(() => of(false)),
      tap((isAuth: boolean) => this.isAuthenticated$.next(isAuth))
    );
  }

  logout(): void {
    this.isAuthenticated$.next(false);
  }
}
