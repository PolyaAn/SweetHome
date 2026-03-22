import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SharedService } from '../../../shared/services/shared.service';
import { Movie, StartMovie } from "../models/movie.model";
import { MovieMock } from "../mocks/movie.mock";
import { Router } from "@angular/router";

@Injectable()
export class MovieModuleService {
  constructor(
    public ss: SharedService,
    private router: Router,
  ) {
  }

  private movieStore: Movie[] = MovieMock;
  movieInfo$: BehaviorSubject<Movie[]> = new BehaviorSubject<Movie[]>(this.ss.getValue(this.movieStore));

  getMoviesInfo(): Observable<Movie[]> {
    return this.movieInfo$;
  }

  setMovieInfo(movie: StartMovie): void {
    const genMovie: Movie = {id: Date.now().toString(), ...movie};
    const moviesInfo: Movie[] = this.ss.getValue(this.movieInfo$.value);
    moviesInfo.push(genMovie);
    this.movieInfo$.next(this.ss.getValue(moviesInfo));
    this.router.navigate(['/movie']);
  }

  getMovieById(movieId: string): Movie | undefined {
    return this.ss.getValue(this.movieInfo$.value).find((movie: Movie) => movie.id === movieId);
  }

  updateMovieInfo(movieId: string, movieData: StartMovie): void {
    const moviesInfo: Movie[] = this.ss.getValue(this.movieInfo$.value).map((movie: Movie) => {
      if (movie.id === movieId) {
        return {
          id: movie.id,
          ...movieData,
        };
      }
      return movie;
    });
    this.movieInfo$.next(this.ss.getValue(moviesInfo));
    this.router.navigate(['/movie']);
  }
}
