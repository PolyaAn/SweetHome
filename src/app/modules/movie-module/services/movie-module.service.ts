import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AddSharedMovieRequest,
  AddSharedMovieResponse,
  MovieFriendSearchResponse,
  MovieFriendsShareSettingsUpdateRequest,
  MovieFriendsShareSettingsVm,
  MovieContentTypeDictionaryItem,
  MovieCreateResponse,
  MovieDetailsVm,
  MovieDictionariesResponse,
  MovieListResponse,
  MovieSearchFilter,
  SharedMovieListResponse,
  SharedMovieListItemVm,
  MovieUpdateResponse,
  MovieUpsertRequest,
} from '../models/movie.model';

@Injectable()
export class MovieModuleService {
  private readonly baseUrl: string = `${environment.apiHost}/api/v1/movies`;
  private readonly fallbackContentTypes: MovieContentTypeDictionaryItem[] = [
    { code: 'MOVIE', name: 'фильм' },
    { code: 'CARTOON', name: 'мультфильм' },
    { code: 'SERIES', name: 'сериал' },
    { code: 'ANIME', name: 'аниме' },
    { code: 'DORAMA', name: 'дорама' },
  ];

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
    }).pipe(
      map((response: MovieDictionariesResponse) => this.normalizeDictionaries(response)),
    );
  }

  searchFriends(query: string): Observable<MovieFriendSearchResponse> {
    let params: HttpParams = new HttpParams();

    if (query) {
      params = params.set('query', query);
    }

    return this.http.get<MovieFriendSearchResponse>(`${this.baseUrl}/friends`, {
      params,
      withCredentials: true,
    });
  }

  getFriendsShareSettings(): Observable<MovieFriendsShareSettingsVm> {
    return this.http.get<MovieFriendsShareSettingsVm>(`${this.baseUrl}/friends/share-settings`, {
      withCredentials: true,
    });
  }

  updateFriendsShareSettings(shareMovies: boolean): Observable<MovieFriendsShareSettingsVm> {
    const payload: MovieFriendsShareSettingsUpdateRequest = {shareMovies};

    return this.http.put<MovieFriendsShareSettingsVm>(`${this.baseUrl}/friends/share-settings`, payload, {
      withCredentials: true,
    });
  }

  getFriendMovies(friendUserId: string, filter: MovieSearchFilter): Observable<SharedMovieListResponse> {
    return this.http.get<SharedMovieListResponse>(`${this.baseUrl}/friends/${friendUserId}`, {
      params: this.buildSearchParams(filter),
      withCredentials: true,
    });
  }

  addSharedMovie(sourceMovieId: string): Observable<AddSharedMovieResponse> {
    const payload: AddSharedMovieRequest = {sourceMovieId};

    return this.http.post<AddSharedMovieResponse>(`${this.baseUrl}/friends/import`, payload, {
      withCredentials: true,
    });
  }

  addSharedMovieWithoutFriendRating(sourceMovie: SharedMovieListItemVm): Observable<AddSharedMovieResponse> {
    return this.addSharedMovie(sourceMovie.movieId).pipe(
      // Import currently copies the shared rating, so the client clears it immediately.
      switchMap((response: AddSharedMovieResponse) => {
        const payload: MovieUpsertRequest = {
          title: sourceMovie.title,
          contentType: sourceMovie.contentType,
          rating: null,
          genres: [...sourceMovie.genres],
          country: sourceMovie.country ?? null,
          comment: sourceMovie.comment ?? null,
        };

        return this.updateMovie(response.movieId, payload).pipe(
          map(() => response),
        );
      }),
    );
  }

  private normalizeDictionaries(response: MovieDictionariesResponse): MovieDictionariesResponse {
    const contentTypesMap: Map<string, MovieContentTypeDictionaryItem> = new Map();

    this.fallbackContentTypes.forEach((item: MovieContentTypeDictionaryItem) => {
      contentTypesMap.set(item.code, item);
    });

    (response.contentTypes || []).forEach((item: MovieContentTypeDictionaryItem) => {
      contentTypesMap.set(item.code, item);
    });

    return {
      ...response,
      contentTypes: Array.from(contentTypesMap.values()),
    };
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

    if (filter.ratingPresence?.includes('WITH_RATING')) {
      params = params.set('withRating', 'true');
    }

    if (filter.ratingPresence?.includes('WITHOUT_RATING')) {
      params = params.set('withoutRating', 'true');
    }

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
