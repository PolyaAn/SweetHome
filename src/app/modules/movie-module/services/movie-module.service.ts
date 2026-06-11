import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  MovieCreateResponse,
  MovieDetailsVm,
  MovieDictionariesResponse,
  MovieListResponse,
  MovieSearchFilter,
  MovieUpdateResponse,
  MovieUpsertRequest,
} from '../models/movie.model';

@Injectable()
export class MovieModuleService {
  private readonly baseUrl: string = `${environment.apiHost}/api/v1/movies`;

  constructor(
    private http: HttpClient,
  ) {
  }

  getMovies(filter: MovieSearchFilter): Observable<MovieListResponse> {
    return this.http.get<MovieListResponse>(this.baseUrl, {
      params: this.buildSearchParams(filter),
      withCredentials: true,
    });
  }

  getMovieById(movieId: string): Observable<MovieDetailsVm> {
    return this.http.get<MovieDetailsVm>(`${this.baseUrl}/${movieId}`, {
      withCredentials: true,
    });
  }

  createMovie(payload: MovieUpsertRequest): Observable<MovieCreateResponse> {
    return this.http.post<MovieCreateResponse>(this.baseUrl, payload, {
      withCredentials: true,
    });
  }

  updateMovie(movieId: string, payload: MovieUpsertRequest): Observable<MovieUpdateResponse> {
    return this.http.put<MovieUpdateResponse>(`${this.baseUrl}/${movieId}`, payload, {
      withCredentials: true,
    });
  }

  deleteMovie(movieId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${movieId}`, {
      withCredentials: true,
    });
  }

  getDictionaries(): Observable<MovieDictionariesResponse> {
    return this.http.get<MovieDictionariesResponse>(`${this.baseUrl}/dictionaries`, {
      withCredentials: true,
    });
  }

  private buildSearchParams(filter: MovieSearchFilter): HttpParams {
    let params: HttpParams = new HttpParams();

    if (filter.query) {
      params = params.set('query', filter.query);
    }

    (filter.contentTypes || []).forEach((type: string) => {
      params = params.append('contentTypes', type);
    });

    (filter.genres || []).forEach((genre: string) => {
      params = params.append('genres', genre);
    });

    (filter.countries || []).forEach((country: string) => {
      params = params.append('countries', country);
    });

    if (filter.ratingFrom !== null && filter.ratingFrom !== undefined) {
      params = params.set('ratingFrom', String(filter.ratingFrom));
    }

    if (filter.ratingTo !== null && filter.ratingTo !== undefined) {
      params = params.set('ratingTo', String(filter.ratingTo));
    }

    if (filter.page) {
      params = params.set('page', String(filter.page));
    }

    if (filter.pageSize) {
      params = params.set('pageSize', String(filter.pageSize));
    }

    if (filter.sortBy) {
      params = params.set('sortBy', filter.sortBy);
    }

    if (filter.sortDirection) {
      params = params.set('sortDirection', filter.sortDirection);
    }

    return params;
  }
}
