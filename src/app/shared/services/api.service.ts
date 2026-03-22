import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

type ApiRequestOptions = {
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  withCredentials?: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(
    private http: HttpClient,
  ) {
  }

  get<T>(url: string, options: ApiRequestOptions = {}): Observable<T> {
    return this.http.get<T>(this.buildUrl(url), this.withDefaultCredentials(options));
  }

  push<T, B = unknown>(url: string, body: B, options: ApiRequestOptions = {}): Observable<T> {
    return this.http.post<T>(this.buildUrl(url), body, this.withDefaultCredentials(options));
  }

  put<T, B = unknown>(url: string, body: B, options: ApiRequestOptions = {}): Observable<T> {
    return this.http.put<T>(this.buildUrl(url), body, this.withDefaultCredentials(options));
  }

  private buildUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    if (!url.startsWith('/')) {
      return `${environment.apiHost}/${url}`;
    }

    return `${environment.apiHost}${url}`;
  }

  private withDefaultCredentials(options: ApiRequestOptions): ApiRequestOptions {
    return {
      withCredentials: true,
      ...options,
    };
  }
}
