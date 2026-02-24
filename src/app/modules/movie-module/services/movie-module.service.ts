import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { SharedService } from '../../../shared/services/shared.service';
import { Movie } from "../models/movie.model";
import { MovieMock } from "../mocks/movie.mock";

@Injectable()
export class MovieModuleService {
  constructor(
    public ss: SharedService,
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

  setMovieInfo(movieInfo: Movie[]): Observable<Movie[]> {
    return of(this.ss.getValue(movieInfo)).pipe(
      tap((updatedMovieInfo: Movie[]) => {
        this.movieStore = this.ss.getValue(updatedMovieInfo);
        this.movieInfo$.next(this.ss.getValue(this.movieStore));
      })
    );
  }
}
