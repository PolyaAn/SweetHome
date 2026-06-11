import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  readonly isAuthenticated$ = new BehaviorSubject<boolean>(false);

  setAuthenticated(isAuthenticated: boolean): void {
    this.isAuthenticated$.next(isAuthenticated);
  }

  clear(): void {
    this.setAuthenticated(false);
  }
}
