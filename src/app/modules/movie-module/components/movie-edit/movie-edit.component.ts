import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { Movie, MovieGenre, MovieType, StartMovie } from "../../models/movie.model";
import { MovieGenreMock } from "../../mocks/movie.mock";
import { MovieModuleService } from "../../services/movie-module.service";

type MovieEditForm = FormGroup;

@Component({
  selector: 'app-movie-edit',
  templateUrl: './movie-edit.component.html',
  styleUrl: './movie-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovieEditComponent implements OnInit {
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private ms: MovieModuleService,
  ) {
  }

  readonly typeOptions: MovieType[] = ['фильм', 'сериал', 'мультфильм'];
  readonly genreOptions: MovieGenre[] = MovieGenreMock;
  readonly selectedGenreIds: Set<string> = new Set<string>();

  movieId: string = '';

  form: MovieEditForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    rating: [''],
    types: ['фильм', Validators.required],
    comment: ['', Validators.required],
  });

  ngOnInit(): void {
    this.movieId = this.route.snapshot.paramMap.get('id') || '';
    const movie: Movie | undefined = this.ms.getMovieById(this.movieId);
    if (!movie) {
      this.router.navigate(['/movie']);
      return;
    }

    this.form.patchValue({
      name: movie.name,
      rating: movie.rating ?? '',
      types: movie.types,
      comment: movie.comment,
    });

    movie.genre.forEach((genre: MovieGenre) => {
      this.selectedGenreIds.add(genre.id);
    });
  }

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
    if (this.form.invalid || !this.selectedGenreIds.size || !this.movieId) {
      this.form.markAllAsTouched();
      return;
    }

    const ratingRaw: string = String(this.form.get('rating')?.value || '').trim();
    const ratingNum: number | null = ratingRaw ? Number(ratingRaw) : null;

    const movie: StartMovie = {
      name: String(this.form.get('name')?.value || '').trim(),
      types: this.form.get('types')?.value as MovieType,
      genre: this.genreOptions.filter((genre: MovieGenre) => this.selectedGenreIds.has(genre.id)),
      comment: String(this.form.get('comment')?.value || '').trim(),
    };

    if (ratingNum !== null && Number.isFinite(ratingNum)) {
      movie.rating = Math.max(1, Math.min(10, ratingNum));
    }

    this.ms.updateMovieInfo(this.movieId, movie);
  }
}
