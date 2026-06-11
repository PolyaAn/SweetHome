import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, switchMap, takeUntil } from 'rxjs';
import { BaseComponent } from '../../../../components/base/base.component';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  ApiErrorResponse,
  MovieContentType,
  MovieContentTypeDictionaryItem,
  MovieDetailsVm,
  MovieDictionariesResponse,
  MovieUpsertRequest,
} from '../../models/movie.model';
import { MovieModuleService } from '../../services/movie-module.service';
import { PendingChangesComponent } from '../../guards/movie-form-deactivate.guard';

type MovieEditForm = FormGroup;

@Component({
  selector: 'app-movie-edit',
  templateUrl: './movie-edit.component.html',
  styleUrl: './movie-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovieEditComponent extends BaseComponent implements OnInit, PendingChangesComponent {
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private ms: MovieModuleService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {
    super();
  }

  readonly fallbackContentTypes: MovieContentTypeDictionaryItem[] = [
    { code: 'MOVIE', name: 'фильм' },
    { code: 'CARTOON', name: 'мультфильм' },
    { code: 'SERIES', name: 'сериал' },
  ];

  movieId: string = '';
  dictionaries: MovieDictionariesResponse = {
    contentTypes: this.fallbackContentTypes,
    genres: [],
    countries: [],
  };
  selectedGenres: string[] = [];
  isLoading: boolean = false;
  isSaving: boolean = false;
  isDeleting: boolean = false;

  form: MovieEditForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(120)]],
    contentType: ['MOVIE' as MovieContentType, Validators.required],
    rating: ['', [Validators.min(0), Validators.max(10)]],
    country: ['', [Validators.maxLength(80)]],
    comment: ['', [Validators.maxLength(5000)]],
  });

  ngOnInit(): void {
    this.movieId = this.route.snapshot.paramMap.get('movieId') || '';
    if (!this.movieId) {
      this.router.navigate(['/movies']);
      return;
    }

    this.isLoading = true;
    this.ms.getDictionaries()
      .pipe(
        switchMap((dictionaries: MovieDictionariesResponse) => {
          this.dictionaries = dictionaries;
          return this.ms.getMovieById(this.movieId);
        }),
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (movie: MovieDetailsVm) => {
          this.patchForm(movie);
        },
        error: () => {
          this.toastService.error('Не удалось загрузить фильм');
          this.router.navigate(['/movies']);
        },
      });
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (!this.canLeavePage()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  toggleGenre(genre: string): void {
    this.selectedGenres = this.selectedGenres.includes(genre)
      ? this.selectedGenres.filter((item: string) => item !== genre)
      : [...this.selectedGenres, genre];
    this.form.markAsDirty();
  }

  isGenreSelected(genre: string): boolean {
    return this.selectedGenres.includes(genre);
  }

  submit(): void {
    if (this.form.invalid || !this.selectedGenres.length || this.isSaving || !this.movieId) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.clearApiErrors();

    this.ms.updateMovie(this.movieId, this.buildPayload())
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.isSaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.form.markAsPristine();
          this.toastService.success('Фильм обновлён');
          this.router.navigate(['/movies']);
        },
        error: (error: { error?: ApiErrorResponse }) => {
          if (!this.applyApiErrors(error.error)) {
            this.toastService.error('Не удалось обновить фильм');
          }
        },
      });
  }

  deleteMovie(): void {
    if (!this.movieId || this.isDeleting) {
      return;
    }

    if (!window.confirm('Удалить фильм?')) {
      return;
    }

    this.isDeleting = true;
    this.ms.deleteMovie(this.movieId)
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.isDeleting = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.form.markAsPristine();
          this.toastService.success('Фильм удалён');
          this.router.navigate(['/movies']);
        },
        error: () => {
          this.toastService.error('Не удалось удалить фильм');
        },
      });
  }

  canDeactivate(): boolean {
    return this.canLeavePage() || window.confirm('Выйти без сохранения?');
  }

  getControl(name: string): AbstractControl | null {
    return this.form.get(name);
  }

  get genreError(): boolean {
    return !this.selectedGenres.length && this.form.touched;
  }

  private patchForm(movie: MovieDetailsVm): void {
    this.selectedGenres = [...movie.genres];
    this.form.patchValue({
      title: movie.title,
      contentType: movie.contentType,
      rating: movie.rating ?? '',
      country: movie.country ?? '',
      comment: movie.comment ?? '',
    });
    this.form.markAsPristine();
  }

  private canLeavePage(): boolean {
    return !this.form.dirty;
  }

  private buildPayload(): MovieUpsertRequest {
    const ratingRaw: string = String(this.form.get('rating')?.value || '').trim();
    const ratingValue: number | null = ratingRaw === '' ? null : Number(ratingRaw);

    return {
      title: String(this.form.get('title')?.value || '').trim(),
      contentType: this.form.get('contentType')?.value as MovieContentType,
      rating: Number.isFinite(ratingValue) ? ratingValue : null,
      genres: this.selectedGenres,
      country: String(this.form.get('country')?.value || '').trim() || null,
      comment: String(this.form.get('comment')?.value || '').trim() || null,
    };
  }

  private applyApiErrors(apiError?: ApiErrorResponse): boolean {
    if (!apiError || apiError.errorCode !== 'VALIDATION_ERROR' || !apiError.details?.length) {
      return false;
    }

    apiError.details.forEach((detail) => {
      if (detail.field === 'genres') {
        this.form.markAllAsTouched();
        return;
      }

      const control = this.form.get(detail.field);
      if (control) {
        control.setErrors({
          ...(control.errors || {}),
          api: detail.message,
        });
        control.markAsTouched();
      }
    });

    return true;
  }

  private clearApiErrors(): void {
    Object.keys(this.form.controls).forEach((name: string) => {
      const control = this.form.get(name);
      if (control?.errors?.['api']) {
        const { api, ...rest } = control.errors;
        control.setErrors(Object.keys(rest).length ? rest : null);
      }
    });
  }
}
