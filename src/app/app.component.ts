import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { EMPTY, catchError, distinctUntilChanged, filter, map, mergeMap } from 'rxjs';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(
    private router: Router,
    http: HttpClient,
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.routerState.snapshot.root.firstChild?.data['activitySection'] as string | undefined),
      distinctUntilChanged(),
      filter((section): section is string => !!section),
      mergeMap(section => http.post<void>(`${environment.apiHost}/api/Activity/Visits`, { section }).pipe(
        catchError(() => EMPTY),
      )),
      takeUntilDestroyed(),
    ).subscribe();
  }

  title = 'SweetHome';

  get showHeader(): boolean {
    return !this.router.url.startsWith('/login') && !this.router.url.startsWith('/register');
  }
}
