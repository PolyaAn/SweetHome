import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface CoinFields {
  name: string;
  country: string | null;
  year: number | null;
  value: string | null;
  grade: string | null;
  quantity: number;
  location: string | null;
  notes: string | null;
}

export interface Coin extends CoinFields {
  id: string;
  hasObverse: boolean;
  hasReverse: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PhotoSide = 'obverse' | 'reverse';
export type PhotoChange = { data: string } | { remove: true };
export type CoinSave = CoinFields & Partial<Record<PhotoSide, PhotoChange>>;

@Injectable({ providedIn: 'root' })
export class CoinsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiHost + '/api/v1/coins';

  list() {
    return this.http.get<Coin[]>(this.url, { withCredentials: true });
  }

  save(value: CoinSave, id?: string) {
    const options = { withCredentials: true };
    return id
      ? this.http.put<Coin>(this.coinUrl(id), value, options)
      : this.http.post<Coin>(this.url, value, options);
  }

  delete(id: string) {
    return this.http.delete<void>(this.coinUrl(id), { withCredentials: true });
  }

  photo(coin: Coin, side: PhotoSide): string {
    return this.coinUrl(coin.id) + '/photos/' + side + '?v=' + encodeURIComponent(coin.updatedAt);
  }

  private coinUrl(id: string): string {
    return this.url + '/' + encodeURIComponent(id);
  }
}
