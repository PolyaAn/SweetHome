import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MainManuService } from "../main-menu/services/main-manu.service";
import { BaseComponent } from "../base/base.component";
import { catchError, filter, map, of, takeUntil } from "rxjs";
import { MatIcon } from "@angular/material/icon";
import { CdkPortalOutlet } from '@angular/cdk/portal';
import { AsyncPipe, Location, NgIf } from "@angular/common";
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink } from "@angular/router";
import { MovieViewMode, SharedService } from "../../shared/services/shared.service";
import { AuthService } from "../../modules/auth/services/auth.service";
import { ToastService } from "../../shared/services/toast.service";

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MatIcon,
    NgIf,
    AsyncPipe,
    RouterLink,
    CdkPortalOutlet,
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
    private toastService: ToastService,
  ) {
    super();
  }

  readonly nickname$ = this.authService.getProfile().pipe(
    map(profile => profile.name),
    catchError(() => of(null))
  );
  readonly headerActions$ = this.ss.headerActions$;
  isMainPage: boolean = false;
  isMoviePage: boolean = false;
  isMovieListPage: boolean = false;
  isFriendMoviesPage: boolean = false;
  isHomePage: boolean = false;
  isHomeRootPage: boolean = false;
  isHomeRoomsPage: boolean = false;
  isHomeDevicesPage: boolean = false;
  isHomeSensorsPage: boolean = false;
  isWardrobeListPage: boolean = false;
  homeRoomId: string | null = null;
  homeRoomTitle: string = '';
  homeWidgetCount: number | null = null;
  pageTitle: string = '';
  movieViewMode: MovieViewMode = 'list';
  friendMoviesOwnerNickname: string = '';
  friendMoviesTotal: number | null = null;

  ngOnInit(): void {
    this.isMainPage = this.router.url.startsWith('/main');
    this.isMoviePage = this.router.url.startsWith('/movies');
    this.isMovieListPage = this.router.url === '/movies';
    this.isFriendMoviesPage = /^\/movies\/friends\/[^/]+$/.test(this.router.url.split('?')[0]);
    this.setHomeRouteState();
    this.setWardrobeRouteState();
    this.pageTitle = this.getCurrentPageTitle();
    this.watchMovieViewMode();
    this.watchFriendMoviesOwnerNickname();
    this.watchFriendMoviesTotal();
    this.watchHomeRoomTitle();
    this.watchHomeWidgetCount();
    this.routeWatcher();
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
          this.isMoviePage = this.router.url.startsWith('/movies');
          this.isMovieListPage = this.router.url === '/movies';
          this.isFriendMoviesPage = /^\/movies\/friends\/[^/]+$/.test(this.router.url.split('?')[0]);
          this.setHomeRouteState();
          this.setWardrobeRouteState();
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

  private watchFriendMoviesOwnerNickname(): void {
    this.ss.friendMoviesOwnerNickname$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (nickname: string) => {
          this.friendMoviesOwnerNickname = nickname;
          this.pageTitle = this.getCurrentPageTitle();
          this.cdr.markForCheck();
        },
      });
  }

  private watchFriendMoviesTotal(): void {
    this.ss.friendMoviesTotal$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (count: number | null) => {
          this.friendMoviesTotal = count;
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

    if (/^\/movies\/friends\/[^/]+$/.test(url)) {
      return 'ФИЛЬМЫ';
    }

    return title;
  }

  get friendMoviesCountLabel(): string {
    const count: number = this.friendMoviesTotal ?? 0;
    const mod10: number = count % 10;
    const mod100: number = count % 100;

    if (mod10 === 1 && mod100 !== 11) {
      return 'фильм';
    }

    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return 'фильма';
    }

    return 'фильмов';
  }

  editMainPage(): void {
    this.mms.editMainPage(true);
  }

  goBack(): void {
    const url = this.router.url.split('?')[0];

    if (url === '/home' || url === '/wardrobe' || url === '/finance' || url === '/books' || url === '/coins' || url === '/profile') {
      this.router.navigate(['/main']);
      return;
    }

    // Открыли страницу гардероба по прямой ссылке — истории внутри приложения нет, идём к списку.
    const navigationId: number = (this.location.getState() as { navigationId?: number } | null)?.navigationId ?? 1;
    if (url.startsWith('/wardrobe/') && navigationId <= 1) {
      this.router.navigate(['/wardrobe'], {replaceUrl: true});
      return;
    }

    if (url.startsWith('/finance/') && navigationId <= 1) {
      this.router.navigate(['/finance'], {replaceUrl: true});
      return;
    }

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
    this.router.navigate(['/movies/create']);
  }

  addWardrobeItem(): void {
    this.router.navigate(['/wardrobe/items/create']);
  }

  openOutfitPicker(): void {
    this.router.navigate(['/wardrobe/outfits/suggest']);
  }

  openFriends(): void {
    this.router.navigate(['/movies/friends']);
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
    this.authService.logout()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: () => this.router.navigate(['/login']),
        error: () => this.toastService.error('Не удалось выйти из аккаунта. Повторите попытку.'),
      });
  }

  private setWardrobeRouteState(): void {
    this.isWardrobeListPage = this.router.url.split('?')[0] === '/wardrobe';
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
