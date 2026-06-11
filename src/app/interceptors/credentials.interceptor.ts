import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Router } from "@angular/router";
import { AuthSessionService } from "../modules/auth/services/auth-session.service";

@Injectable()
export class CredentialsInterceptor implements HttpInterceptor {
  constructor(
    private authSession: AuthSessionService,
    private router: Router,
  ) {
  }

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const isApiRequest = this.isApiRequest(req.url);
    const request = isApiRequest
      ? req.clone({withCredentials: true})
      : req;

    return next.handle(request).pipe(
      catchError((error: unknown) => {
        if (
          error instanceof HttpErrorResponse &&
          error.status === 401 &&
          isApiRequest &&
          !this.isAuthRequest(req.url)
        ) {
          this.authSession.clear();
          this.router.navigate(['/login']);
        }

        return throwError(() => error);
      }),
    );
  }

  private isApiRequest(url: string): boolean {
    if (environment.apiHost) {
      return url.startsWith(environment.apiHost);
    }

    return url.startsWith('/api/') || url.startsWith('/Account/');
  }

  private isAuthRequest(url: string): boolean {
    return url.includes('/Account/Login') || url.includes('/api/Account/Register');
  }
}
