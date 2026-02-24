import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  QueryList,
  ViewChildren
} from '@angular/core';
import { BaseComponent } from "../../components/base/base.component";
import { Movie, MovieGenre } from "./models/movie.model";
import { MovieModuleService } from "./services/movie-module.service";
import { takeUntil } from "rxjs";
import { SharedService } from "../../shared/services/shared.service";

@Component({
  selector: 'app-movie-module',
  templateUrl: './movie-module.component.html',
  styleUrl: './movie-module.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovieModuleComponent extends BaseComponent implements OnInit, AfterViewInit {
  constructor(
    private ms: MovieModuleService,
    private cdr: ChangeDetectorRef,
    private ss: SharedService,
  ) {
    super();
  }

  @ViewChildren('commentBlock') commentBlocks!: QueryList<ElementRef<HTMLElement>>;

  movies: Movie[] = [];
  searchQuery: string = '';
  selectedGenreId: string = 'all';
  minRating: string = '';
  maxRating: string = '';
  showPhoneFilters: boolean = false;
  expandedComments: Record<string, boolean> = {};
  canToggleComments: Record<string, boolean> = {};

  get isPhone(): boolean {
    return this.ss.isPhone;
  }

  ngOnInit(): void {
    this.ms.getMoviesInfo()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (movies: Movie[]) => {
          this.movies = this.cloneMovies(this.ms.movieInfo$.value);
          setTimeout(() => this.updateCommentToggleMap());
          this.cdr.markForCheck();
        },
      });
  }

  ngAfterViewInit(): void {
    this.commentBlocks.changes
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(() => {
        this.updateCommentToggleMap();
      });
  }

  get genreOptions(): MovieGenre[] {
    const genreMap: Record<string, MovieGenre> = {};
    this.movies.forEach((movie: Movie) => {
      this.getGenres(movie).forEach((genre: MovieGenre) => {
        if (!genreMap[genre.id]) {
          genreMap[genre.id] = genre;
        }
      });
    });
    return Object.values(genreMap);
  }

  get filteredMovies(): Movie[] {
    const normalizedQuery: string = this.searchQuery.trim().toLowerCase();
    const minRatingValue: number | null = this.minRating ? Number(this.minRating) : null;
    const maxRatingValue: number | null = this.maxRating ? Number(this.maxRating) : null;

    return this.movies.filter((movie: Movie) => {
      if (minRatingValue !== null && movie.rating < minRatingValue) {
        return false;
      }

      if (maxRatingValue !== null && movie.rating > maxRatingValue) {
        return false;
      }

      if (this.selectedGenreId !== 'all') {
        const hasGenre: boolean = this.getGenres(movie).some((genre: MovieGenre) => genre.id === this.selectedGenreId);
        if (!hasGenre) {
          return false;
        }
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchable: string = `${movie.name} ${movie.comment || ''}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    setTimeout(() => this.updateCommentToggleMap());
  }

  onGenreChange(value: string): void {
    this.selectedGenreId = value;
    setTimeout(() => this.updateCommentToggleMap());
  }

  onMinRatingChange(value: string): void {
    this.minRating = value;
    setTimeout(() => this.updateCommentToggleMap());
  }

  onMaxRatingChange(value: string): void {
    this.maxRating = value;
    setTimeout(() => this.updateCommentToggleMap());
  }

  togglePhoneFilters(): void {
    this.showPhoneFilters = !this.showPhoneFilters;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateCommentToggleMap();
  }

  private cloneMovies(movies: Movie[]): Movie[] {
    return JSON.parse(JSON.stringify(movies));
  }

  isCommentExpanded(movieId: string): boolean {
    return !!this.expandedComments[movieId];
  }

  toggleComment(movieId: string): void {
    this.expandedComments = {
      ...this.expandedComments,
      [movieId]: !this.expandedComments[movieId],
    };
  }

  showToggle(movieId: string): boolean {
    return !!this.canToggleComments[movieId];
  }

  getGenres(movie: Movie): MovieGenre[] {
    const movieWithFlexibleGenre: Movie = movie;
    return movieWithFlexibleGenre.genre || [];
  }

  getGenresLabel(movie: Movie): string {
    return this.getGenres(movie).map((genre: MovieGenre) => genre.name).join(', ');
  }

  private updateCommentToggleMap(): void {
    if (!this.commentBlocks) {
      return;
    }

    const toggleMap: Record<string, boolean> = {};
    this.commentBlocks.forEach((commentRef: ElementRef<HTMLElement>) => {
      const element: HTMLElement = commentRef.nativeElement;
      const movieId: string | null = element.dataset['movieId'] ?? null;
      if (!movieId) {
        return;
      }

      // Compare full content height against visible clamped height.
      toggleMap[movieId] = element.scrollHeight > element.clientHeight + 1;
    });

    this.canToggleComments = toggleMap;
    this.cdr.markForCheck();
  }
}
