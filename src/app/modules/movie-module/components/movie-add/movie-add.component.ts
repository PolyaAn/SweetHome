import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, takeUntil } from 'rxjs';
import { BaseComponent } from '../../../../components/base/base.component';
import { ToastService } from '../../../../shared/services/toast.service';
import { PendingChangesComponent } from '../../guards/movie-form-deactivate.guard';
import {
  ApiErrorResponse,
  MovieContentType,
  MovieContentTypeDictionaryItem,
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

  submit(): void {
    if (this.form.invalid || !this.selectedGenres.length || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.clearApiErrors();

    this.ms.createMovie(this.buildPayload())
      .pipe(
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
