import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs';
import { BaseComponent } from '../../../../components/base/base.component';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  MovieFriendListItemVm,
  MovieFriendsShareSettingsVm,
} from '../../models/movie.model';
import { MovieModuleService } from '../../services/movie-module.service';

@Component({
  selector: 'app-movie-friends',
  templateUrl: './movie-friends.component.html',
  styleUrl: './movie-friends.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovieFriendsComponent extends BaseComponent implements OnInit {
  private readonly search$ = new Subject<string>();

  constructor(
    private ms: MovieModuleService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private toastService: ToastService,
  ) {
    super();
  }

  friends: MovieFriendListItemVm[] = [];
  draftSearchQuery: string = '';
  searchQuery: string = '';
  shareMovies: boolean = false;
  friendsLoading: boolean = false;
  shareLoading: boolean = false;
  settingsLoading: boolean = false;
  errorMessage: string = '';

  ngOnInit(): void {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.unsubscribe$),
      )
      .subscribe({
        next: (query: string) => {
          this.searchQuery = query;
          this.loadFriends();
        },
      });

    this.loadShareSettings();
    this.loadFriends();
  }

  onSearchInput(value: string): void {
    this.draftSearchQuery = value;
    this.search$.next(value.trim());
  }

  clearSearch(): void {
    this.draftSearchQuery = '';
    this.search$.next('');
  }

  toggleShareMovies(checked: boolean): void {
    const previousValue: boolean = this.shareMovies;

    this.shareMovies = checked;
    this.shareLoading = true;
    this.cdr.markForCheck();

    this.ms.updateFriendsShareSettings(checked)
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.shareLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response: MovieFriendsShareSettingsVm) => {
          this.shareMovies = response.shareMovies;
          this.toastService.success(response.shareMovies ? 'Список фильмов открыт друзьям' : 'Доступ к списку фильмов закрыт');
        },
        error: () => {
          this.shareMovies = previousValue;
          this.toastService.error('Не удалось обновить настройку доступа');
        },
      });
  }

  openFriend(friendUserId: string): void {
    this.router.navigate(['/movies/friends', friendUserId]);
  }

  retry(): void {
    this.loadShareSettings();
    this.loadFriends();
  }

  trackByUserId(_: number, friend: MovieFriendListItemVm): string {
    return friend.userId;
  }

  private loadShareSettings(): void {
    this.settingsLoading = true;

    this.ms.getFriendsShareSettings()
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.settingsLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response: MovieFriendsShareSettingsVm) => {
          this.shareMovies = response.shareMovies;
        },
        error: () => {
          this.toastService.error('Не удалось загрузить настройку доступа к списку фильмов');
        },
      });
  }

  private loadFriends(): void {
    this.friendsLoading = true;
    this.errorMessage = '';

    this.ms.searchFriends(this.searchQuery)
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.friendsLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          this.friends = response.items;
        },
        error: () => {
          this.errorMessage = 'Не удалось загрузить список друзей';
        },
      });
  }
}
