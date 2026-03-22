import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Movie, MovieGenre, MovieType } from "./models/movie.model";
import { MovieGenreMock } from "./mocks/movie.mock";
import { MovieModuleService } from "./services/movie-module.service";

type MovieAddForm = FormGroup;

@Component({
  selector: 'app-movie-add',
  templateUrl: './movie-add.component.html',
  styleUrl: './movie-add.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovieAddComponent {
  constructor(
    private fb: FormBuilder,
    private ms: MovieModuleService,
  ) {
  }

  readonly typeOptions: MovieType[] = ['фильм', 'сериал', 'мультфильм'];
  readonly genreOptions: MovieGenre[] = MovieGenreMock;
  readonly selectedGenreIds: Set<string> = new Set<string>();

  form: MovieAddForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    rating: [''],
    types: ['фильм', Validators.required],
    comment: ['', Validators.required],
  });

  draftMovie: Movie | null = null;

  toggleGenre(genreId: string): void {
    if (this.selectedGenreIds.has(genreId)) {
      this.selectedGenreIds.delete(genreId);
      return;
    }
    this.selectedGenreIds.add(genreId);
  }

  isGenreSelected(genreId: string): boolean {
    return this.selectedGenreIds.has(genreId);
  }

  submit(): void {
    if (this.form.invalid || !this.selectedGenreIds.size) {
      this.form.markAllAsTouched();
      return;
    }

    const ratingRaw: string = String(this.form.get('rating')?.value || '').trim();
    const ratingNum: number | null = ratingRaw ? Number(ratingRaw) : null;

    const movie: Movie = {
      id: Date.now().toString(),
      name: String(this.form.get('name')?.value || '').trim(),
      types: this.form.get('types')?.value as MovieType,
      genre: this.genreOptions.filter((genre: MovieGenre) => this.selectedGenreIds.has(genre.id)),
      comment: String(this.form.get('comment')?.value || '').trim(),
    };

    if (ratingNum !== null && Number.isFinite(ratingNum)) {
      movie.rating = Math.max(1, Math.min(10, ratingNum));
    }

    this.ms.setMovieInfo(movie);
  }
}
