import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpResponse } from "@angular/common/http";
import { BehaviorSubject, catchError, map, Observable, of, tap } from "rxjs";
import { environment } from "../../../../environments/environment";

export interface RegisterResult {
  isRegistered: boolean;
  errorMessage?: string;
}

export interface LoginResult {
  isAuth: boolean;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private http: HttpClient,
  ) {
  }

  isAuthenticated$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  login(email: string, password: string): Observable<LoginResult> {
    return this.http.post(`${environment.apiHost}/Account/Login`, {
      email,
      password,
    }, {
      withCredentials: true,
      observe: 'response',
    }).pipe(
      map((response: HttpResponse<unknown>) => ({isAuth: response.ok})),
      catchError((error: HttpErrorResponse) => of({
        isAuth: false,
        errorMessage: this.extractErrorMessage(error, 'Не удалось выполнить вход'),
      })),
      tap((result: LoginResult) => this.isAuthenticated$.next(result.isAuth))
    );
  }

  register(name: string, email: string, password: string, confirmPassword: string): Observable<RegisterResult> {
    return this.http.post(`${environment.apiHost}/api/Account/Register`, {
      name,
      email,
      password,
      confirmPassword,
    }, {
      withCredentials: true,
      observe: 'response',
    }).pipe(
      map((response: HttpResponse<unknown>) => ({isRegistered: response.ok})),
      catchError((error: HttpErrorResponse) => of({
        isRegistered: false,
        errorMessage: this.extractErrorMessage(error, 'Не удалось зарегистрироваться'),
      })),
    );
  }

  logout(): void {
    this.isAuthenticated$.next(false);
  }

  private extractErrorMessage(error: HttpErrorResponse, fallbackMessage: string): string {
    if (!error?.error) {
      return fallbackMessage;
    }

    if (typeof error.error === 'string') {
      return error.error;
    }

    if (typeof error.error?.message === 'string') {
      return error.error.message;
    }

    if (Array.isArray(error.error?.errors) && error.error.errors.length) {
      return String(error.error.errors[0]);
    }

    if (typeof error.error?.title === 'string') {
      return error.error.title;
    }

    return fallbackMessage;
  }
}
