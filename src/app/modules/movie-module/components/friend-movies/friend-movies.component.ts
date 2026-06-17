import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize, takeUntil } from 'rxjs';
import { BaseComponent } from '../../../../components/base/base.component';
import { SharedService } from '../../../../shared/services/shared.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { MovieContentTypeDictionaryItem, SharedMovieListItemVm, SharedMovieListResponse } from '../../models/movie.model';
import { MovieModuleService } from '../../services/movie-module.service';

@Component({
  selector: 'app-friend-movies',
  templateUrl: './friend-movies.component.html',
  styleUrl: './friend-movies.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FriendMoviesComponent extends BaseComponent implements OnInit {
  private readonly pageSize = 20;

  constructor(
    private route: ActivatedRoute,
    private ms: MovieModuleService,
    private cdr: ChangeDetectorRef,
    private ss: SharedService,
    private toastService: ToastService,
  ) {
    super();
  }

  friendUserId: string = '';
  ownerNickname: string = '';
  movies: SharedMovieListItemVm[] = [];
  total: number = 0;
  currentPage: number = 1;
  hasNext: boolean = false;
  listLoading: boolean = false;
  loadingMore: boolean = false;
  errorMessage: string = '';
  addingMovieIds: Set<string> = new Set<string>();
  readonly fallbackContentTypes: MovieContentTypeDictionaryItem[] = [
    { code: 'MOVIE', name: 'фильм' },
    { code: 'CARTOON', name: 'мультфильм' },
    { code: 'SERIES', name: 'сериал' },
    { code: 'ANIME', name: 'аниме' },
    { code: 'DORAMA', name: 'дорама' },
  ];

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (params) => {
          this.friendUserId = params.get('friendUserId') || '';
          this.currentPage = 1;
          this.movies = [];
          this.ownerNickname = '';
          this.total = 0;
          this.ss.setFriendMoviesOwnerNickname('');
          this.ss.setFriendMoviesTotal(null);
          this.loadMovies(true);
        },
      });
  }

  override ngOnDestroy(): void {
    this.ss.setFriendMoviesOwnerNickname('');
    this.ss.setFriendMoviesTotal(null);
    super.ngOnDestroy();
  }

  retry(): void {
    this.loadMovies(true);
  }

  loadMore(): void {
    if (!this.hasNext || this.loadingMore || this.listLoading) {
      return;
    }

    this.currentPage += 1;
    this.loadMovies(false);
  }

  addMovie(movie: SharedMovieListItemVm): void {
    if (movie.isInMyList || this.addingMovieIds.has(movie.movieId)) {
      return;
    }

    this.addingMovieIds.add(movie.movieId);
    this.cdr.markForCheck();

    this.ms.addSharedMovieWithoutFriendRating(movie)
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.addingMovieIds.delete(movie.movieId);
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.movies = this.movies.map((item: SharedMovieListItemVm) => item.movieId === movie.movieId
            ? {...item, isInMyList: true}
            : item);
          this.toastService.success('Фильм добавлен в ваш список');
        },
        error: () => {
          this.toastService.error('Не удалось добавить фильм в ваш список');
        },
      });
  }

  isAddingMovie(movieId: string): boolean {
    return this.addingMovieIds.has(movieId);
  }

  getTypeLabel(code: string): string {
    return this.fallbackContentTypes.find((item: MovieContentTypeDictionaryItem) => item.code === code)?.name || code;
  }

  trackByMovieId(_: number, movie: SharedMovieListItemVm): string {
    return movie.movieId;
  }

  private loadMovies(reset: boolean): void {
    if (!this.friendUserId) {
      this.errorMessage = 'Пользователь не найден';
      this.ss.setFriendMoviesOwnerNickname('');
      this.ss.setFriendMoviesTotal(null);
      this.cdr.markForCheck();
      return;
    }

    if (reset) {
      this.currentPage = 1;
      this.movies = [];
      this.errorMessage = '';
      this.listLoading = true;
    } else {
      this.loadingMore = true;
    }

    this.ms.getFriendMovies(this.friendUserId, this.currentPage, this.pageSize)
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.listLoading = false;
          this.loadingMore = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response: SharedMovieListResponse) => {
          this.ownerNickname = response.ownerNickname;
          this.total = response.total;
          this.hasNext = response.hasNext;
          this.movies = reset ? response.items : [...this.movies, ...response.items];
          this.ss.setFriendMoviesOwnerNickname(response.ownerNickname);
          this.ss.setFriendMoviesTotal(response.total);
        },
        error: () => {
          this.errorMessage = 'Не удалось загрузить список фильмов друга';
          this.ss.setFriendMoviesOwnerNickname('');
          this.ss.setFriendMoviesTotal(null);
          if (!reset) {
            this.currentPage = Math.max(1, this.currentPage - 1);
          }
        },
      });
  }
}
