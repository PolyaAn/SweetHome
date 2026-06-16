import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EMPTY, Observable, finalize, map, switchMap, takeUntil } from 'rxjs';
import { BaseComponent } from '../../../../components/base/base.component';
import { ToastService } from '../../../../shared/services/toast.service';
import { PendingChangesComponent } from '../../guards/movie-form-deactivate.guard';
import {
  ApiErrorResponse,
  MovieContentType,
  MovieContentTypeDictionaryItem,
  MovieListItemVm,
  MovieDictionariesResponse,
  MovieUpsertRequest,
} from '../../models/movie.model';
import { MovieModuleService } from '../../services/movie-module.service';

type MovieAddForm = FormGroup;

@Component({
  selector: 'app-movie-add',
  templateUrl: './movie-add.component.html',
  styleUrl: './movie-add.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovieAddComponent extends BaseComponent implements OnInit, PendingChangesComponent {
  constructor(
    private fb: FormBuilder,
    private ms: MovieModuleService,
    private router: Router,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {
    super();
  }

  readonly fallbackContentTypes: MovieContentTypeDictionaryItem[] = [
    { code: 'MOVIE', name: 'фильм' },
    { code: 'CARTOON', name: 'мультфильм' },
    { code: 'SERIES', name: 'сериал' },
    { code: 'ANIME', name: 'аниме' },
    { code: 'DORAMA', name: 'дорама' },
  ];

  dictionaries: MovieDictionariesResponse = {
    contentTypes: this.fallbackContentTypes,
    genres: [],
    countries: [],
  };
  selectedGenres: string[] = [];
  allowNavigationAfterSave: boolean = false;
  isSaving: boolean = false;
  isLoading: boolean = false;

  form: MovieAddForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(120)]],
    contentType: ['MOVIE' as MovieContentType, Validators.required],
    rating: ['', [Validators.min(0), Validators.max(10)]],
    country: ['', [Validators.maxLength(80)]],
    comment: ['', [Validators.maxLength(5000)]],
  });

  ngOnInit(): void {
    this.isLoading = true;
    this.ms.getDictionaries()
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (dictionaries: MovieDictionariesResponse) => {
          this.dictionaries = dictionaries;
        },
        error: () => {
          this.toastService.error('Не удалось загрузить справочники кино');
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
  }

  isGenreSelected(genre: string): boolean {
    return this.selectedGenres.includes(genre);
  }

  selectCountry(country: string): void {
    this.form.get('country')?.setValue(country);
    this.form.get('country')?.markAsDirty();
    this.form.get('country')?.markAsTouched();
  }

  submit(): void {
    if (this.form.invalid || !this.selectedGenres.length || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: MovieUpsertRequest = this.buildPayload();
    this.isSaving = true;
    this.clearApiErrors();

    this.findDuplicateMovie(payload)
      .pipe(
        switchMap((hasDuplicate: boolean) => {
          if (hasDuplicate) {
            this.showDuplicateWarning();
            return EMPTY;
          }

          return this.ms.createMovie(payload);
        }),
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.isSaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.allowNavigationAfterSave = true;
          this.form.markAsPristine();
          this.toastService.success('Фильм сохранён');
          this.router.navigate(['/movies']);
        },
        error: (error: { error?: ApiErrorResponse }) => {
          if (!this.applyApiErrors(error.error)) {
            this.toastService.error('Не удалось сохранить фильм');
          }
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

  private canLeavePage(): boolean {
    if (this.allowNavigationAfterSave) {
      return true;
    }

    return !this.form.dirty && !this.selectedGenres.length;
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

  private findDuplicateMovie(payload: MovieUpsertRequest): Observable<boolean> {
    return this.ms.getMovies({
      query: payload.title,
      contentTypes: [payload.contentType],
      page: 1,
      pageSize: 100,
    }).pipe(
      map((response) => response.items.some((movie: MovieListItemVm) => this.isDuplicateMovie(movie, payload))),
    );
  }

  private isDuplicateMovie(movie: MovieListItemVm, payload: MovieUpsertRequest): boolean {
    return movie.contentType === payload.contentType
      && this.normalizeTitle(movie.title) === this.normalizeTitle(payload.title);
  }

  private normalizeTitle(value: string): string {
    return value.trim().toLocaleLowerCase('ru-RU');
  }

  private showDuplicateWarning(): void {
    const control: AbstractControl | null = this.form.get('title');
    const message: string = 'Фильм с таким названием уже есть в списке';

    control?.setErrors({
      ...(control.errors || {}),
      api: message,
    });
    control?.markAsTouched();
    this.toastService.warning(message);
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
