import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { SharedService } from '../../../shared/services/shared.service';
import { Movie } from "../models/movie.model";
import { MovieMock } from "../mocks/movie.mock";
import { Router } from "@angular/router";

@Injectable()
export class MovieModuleService {
  constructor(
    public ss: SharedService,
    private router: Router,
  ) {
  }

  private movieStore: Movie[] = [];
  movieInfo$: BehaviorSubject<Movie[]> = new BehaviorSubject<Movie[]>(this.ss.getValue(this.movieStore));

  getMoviesInfo(): Observable<Movie[]> {
    return of(this.ss.getValue(this.movieStore)).pipe(
      tap((movieInfo: Movie[]) => {
        movieInfo = MovieMock;
        this.movieInfo$.next(this.ss.getValue(movieInfo));
        console.log(this.movieInfo$.value);
      })
    );
  }

  setMovieInfo(movie: Movie): void {
    const moviesInfo: Movie[] = this.ss.getValue(this.movieInfo$.value);
    moviesInfo.push(movie);
    this.movieInfo$.next(this.ss.getValue(moviesInfo));
    this.router.navigate(['/movie']);
    // return this.movieInfo$;
  }
}
