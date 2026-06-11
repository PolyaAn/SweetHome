import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MainManuService } from "../main-menu/services/main-manu.service";
import { BaseComponent } from "../base/base.component";
import { filter, takeUntil } from "rxjs";
import { UserInfo } from "../main-menu/models/main-menu.model";
import { MatIcon } from "@angular/material/icon";
import { NgIf } from "@angular/common";
import { Location } from "@angular/common";
import { ActivatedRouteSnapshot, NavigationEnd, Router } from "@angular/router";
import { MovieViewMode, SharedService } from "../../shared/services/shared.service";
import { AuthService } from "../../modules/auth/services/auth.service";

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MatIcon,
    NgIf
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent extends BaseComponent implements OnInit {
  private readonly homeRootBackRoutes: string[] = [
    '/home/rooms',
    '/home/devices',
    '/home/sensors',
    '/home/scenarios',
    '/home/automations',
    '/home/events',
  ];
  private currentRoomRouteId: string | null = null;

  constructor(
    private mms: MainManuService,
    private router: Router,
    private location: Location,
    private cdr: ChangeDetectorRef,
    private ss: SharedService,
    private authService: AuthService,
  ) {
    super();
  }

  user: UserInfo | undefined;
  isMainPage: boolean = false;
  isMoviePage: boolean = false;
  isMovieListPage: boolean = false;
  isHomePage: boolean = false;
  isHomeRootPage: boolean = false;
  isHomeRoomsPage: boolean = false;
  isHomeDevicesPage: boolean = false;
  isHomeSensorsPage: boolean = false;
  homeRoomId: string | null = null;
  homeRoomTitle: string = '';
  homeWidgetCount: number | null = null;
  pageTitle: string = '';
  movieViewMode: MovieViewMode = 'list';

  ngOnInit(): void {
    this.isMainPage = this.router.url.startsWith('/main');
    this.isMoviePage = this.router.url.startsWith('/movie');
    this.isMovieListPage = this.router.url === '/movie';
    this.setHomeRouteState();
    this.pageTitle = this.getCurrentPageTitle();
    this.watchMovieViewMode();
    this.watchHomeRoomTitle();
    this.watchHomeWidgetCount();
    this.routeWatcher();
    this.getUserInfo();
  }

  private getUserInfo(): void {
    this.mms.getUserInfo()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (user: UserInfo) => {
          this.user = user;
          this.cdr.markForCheck();
        },
        error: () => {
        },
      });
  }

  private routeWatcher(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.unsubscribe$)
      )
      .subscribe({
        next: () => {
          this.isMainPage = this.router.url.startsWith('/main');
          this.isMoviePage = this.router.url.startsWith('/movie');
          this.isMovieListPage = this.router.url === '/movie';
          this.setHomeRouteState();
          this.pageTitle = this.getCurrentPageTitle();
          this.cdr.markForCheck();
        },
      });
  }

  private watchMovieViewMode(): void {
    this.ss.movieViewMode$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (mode: MovieViewMode) => {
          this.movieViewMode = mode;
          this.cdr.markForCheck();
        },
      });
  }

  private watchHomeRoomTitle(): void {
    this.ss.homeRoomTitle$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (title: string) => {
          this.homeRoomTitle = title;
          this.pageTitle = this.getCurrentPageTitle();
          this.cdr.markForCheck();
        },
      });
  }

  private watchHomeWidgetCount(): void {
    this.ss.homeWidgetCount$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (count: number | null) => {
          this.homeWidgetCount = count;
          this.pageTitle = this.getCurrentPageTitle();
          this.cdr.markForCheck();
        },
      });
  }

  private getCurrentPageTitle(): string {
    const url = this.router.url.split('?')[0];
    let snapshot: ActivatedRouteSnapshot = this.router.routerState.snapshot.root;

    while (snapshot.firstChild) {
      snapshot = snapshot.firstChild;
    }

    const title = snapshot.data?.['title'] || '';

    if (this.homeRoomId && this.homeRoomTitle) {
      return this.homeRoomTitle;
    }

    if ((url === '/home/devices' || url === '/home/sensors') && this.homeWidgetCount !== null) {
      return `${title} (${this.homeWidgetCount})`;
    }

    return title;
  }

  editMainPage(): void {
    this.mms.editMainPage(true);
  }

  goBack(): void {
    const url = this.router.url.split('?')[0];

    if (this.homeRootBackRoutes.includes(url)) {
      this.router.navigate(['/home']);
      return;
    }

    this.location.back();
  }

  toggleMovieViewMode(): void {
    const nextMode: MovieViewMode = this.movieViewMode === 'list' ? 'grid' : 'list';
    this.ss.setMovieViewMode(nextMode);
  }

  addMovie(): void {
    this.router.navigate(['/movie/add']);
  }

  openHomeSettings(): void {
    this.router.navigate(['/home/rooms']);
  }

  addRoom(): void {
    this.router.navigate(['/home/rooms/create']);
  }

  addHomeWidget(): void {
    if (this.isHomeSensorsPage) {
      this.router.navigate(['/home/sensors/add']);
      return;
    }

    this.router.navigate(['/home/devices/add']);
  }

  openRoomSettings(): void {
    if (!this.homeRoomId) {
      return;
    }

    this.router.navigate(['/home/rooms', this.homeRoomId, 'settings']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private setHomeRouteState(): void {
    const url = this.router.url.split('?')[0];
    const roomMatch = url.match(/^\/home\/rooms\/([^/]+)(?:\/.*)?$/);

    this.isHomePage = url.startsWith('/home');
    this.isHomeRootPage = url === '/home';
    this.isHomeRoomsPage = url === '/home/rooms';
    this.isHomeDevicesPage = url === '/home/devices';
    this.isHomeSensorsPage = url === '/home/sensors';
    const candidateRoomId = roomMatch?.[1] ?? null;
    this.homeRoomId = candidateRoomId && candidateRoomId !== 'create' ? candidateRoomId : null;

    if (this.currentRoomRouteId !== this.homeRoomId) {
      this.currentRoomRouteId = this.homeRoomId;
      this.ss.setHomeRoomTitle('');
    }
  }
}
