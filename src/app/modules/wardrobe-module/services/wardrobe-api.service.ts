import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  OutfitSuggestRequest,
  OutfitSuggestResponse,
  WARDROBE_FALLBACK_DICTIONARIES,
  WardrobeClassification,
  WardrobeDictionaries,
  WardrobeImageVariant,
  WardrobeItem,
  WardrobeItemFilter,
  WardrobeItemListResponse,
  WardrobeItemUpsertRequest,
  WardrobeOutfit,
  WardrobeOutfitCreateRequest,
} from '../models/wardrobe.model';

@Injectable()
export class WardrobeApiService {
  private readonly baseUrl: string = `${environment.apiHost}/api/v1/wardrobe`;
  private dictionaries$?: Observable<WardrobeDictionaries>;

  constructor(private http: HttpClient) {
  }

  getDictionaries(): Observable<WardrobeDictionaries> {
    if (!this.dictionaries$) {
      this.dictionaries$ = this.http.get<WardrobeDictionaries>(`${this.baseUrl}/dictionaries`, {withCredentials: true}).pipe(
        map((response: WardrobeDictionaries) => ({
          categories: response.categories?.length ? response.categories : WARDROBE_FALLBACK_DICTIONARIES.categories,
          seasons: response.seasons?.length ? response.seasons : WARDROBE_FALLBACK_DICTIONARIES.seasons,
          styles: response.styles?.length ? response.styles : WARDROBE_FALLBACK_DICTIONARIES.styles,
          colors: response.colors?.length ? response.colors : WARDROBE_FALLBACK_DICTIONARIES.colors,
          warmthLevels: response.warmthLevels?.length ? response.warmthLevels : WARDROBE_FALLBACK_DICTIONARIES.warmthLevels,
          backgroundRemoval: !!response.backgroundRemoval,
        })),
        catchError(() => {
          this.dictionaries$ = undefined;
          return of(WARDROBE_FALLBACK_DICTIONARIES);
        }),
        shareReplay(1),
      );
    }

    return this.dictionaries$;
  }

  getItems(filter: WardrobeItemFilter = {}): Observable<WardrobeItemListResponse> {
    let params: HttpParams = new HttpParams();
    if (filter.query?.trim()) {
      params = params.set('query', filter.query.trim());
    }
    if (filter.category) {
      params = params.set('category', filter.category);
    }
    if (filter.favorite !== null && filter.favorite !== undefined) {
      params = params.set('favorite', String(filter.favorite));
    }

    return this.http.get<WardrobeItemListResponse>(`${this.baseUrl}/items`, {params, withCredentials: true});
  }

  getItem(itemId: string): Observable<WardrobeItem> {
    return this.http.get<WardrobeItem>(`${this.baseUrl}/items/${encodeURIComponent(itemId)}`, {withCredentials: true});
  }

  createItem(payload: WardrobeItemUpsertRequest): Observable<WardrobeItem> {
    return this.http.post<WardrobeItem>(`${this.baseUrl}/items`, payload, {withCredentials: true});
  }

  updateItem(itemId: string, payload: WardrobeItemUpsertRequest): Observable<WardrobeItem> {
    return this.http.put<WardrobeItem>(`${this.baseUrl}/items/${encodeURIComponent(itemId)}`, payload, {withCredentials: true});
  }

  deleteItem(itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/items/${encodeURIComponent(itemId)}`, {withCredentials: true});
  }

  wearItem(itemId: string): Observable<WardrobeItem> {
    return this.http.post<WardrobeItem>(`${this.baseUrl}/items/${encodeURIComponent(itemId)}/wear`, {}, {withCredentials: true});
  }

  /** Без variant — версия, выбранная для показа (без фона, если она готова и выбрана). */
  getImageBlob(item: Pick<WardrobeItem, 'id' | 'imageUpdatedAt'>, variant?: WardrobeImageVariant): Observable<Blob> {
    let params: HttpParams = new HttpParams();
    if (item.imageUpdatedAt) {
      params = params.set('v', item.imageUpdatedAt);
    }
    if (variant) {
      params = params.set('variant', variant.toLowerCase());
    }
    return this.http.get(`${this.baseUrl}/items/${encodeURIComponent(item.id)}/image`, {
      params,
      responseType: 'blob',
      withCredentials: true,
    });
  }

  setImageVariant(itemId: string, variant: WardrobeImageVariant): Observable<WardrobeItem> {
    return this.http.put<WardrobeItem>(`${this.baseUrl}/items/${encodeURIComponent(itemId)}/image/variant`, {variant}, {withCredentials: true});
  }

  reprocessImage(itemId: string): Observable<WardrobeItem> {
    return this.http.post<WardrobeItem>(`${this.baseUrl}/items/${encodeURIComponent(itemId)}/image/reprocess`, {}, {withCredentials: true});
  }

  uploadImage(itemId: string, file: Blob, fileName: string = 'photo.jpg'): Observable<WardrobeItem> {
    const form: FormData = new FormData();
    form.append('file', file, fileName);
    return this.http.put<WardrobeItem>(`${this.baseUrl}/items/${encodeURIComponent(itemId)}/image`, form, {withCredentials: true});
  }

  deleteImage(itemId: string): Observable<WardrobeItem> {
    return this.http.delete<WardrobeItem>(`${this.baseUrl}/items/${encodeURIComponent(itemId)}/image`, {withCredentials: true});
  }

  classify(name: string, notes: string | null, colorHex: string | null): Observable<WardrobeClassification> {
    return this.http.post<WardrobeClassification>(`${this.baseUrl}/classify`, {name, notes, colorHex}, {withCredentials: true});
  }

  suggestOutfits(request: OutfitSuggestRequest): Observable<OutfitSuggestResponse> {
    return this.http.post<OutfitSuggestResponse>(`${this.baseUrl}/outfits/suggest`, request, {withCredentials: true});
  }

  getOutfits(): Observable<WardrobeOutfit[]> {
    return this.http.get<WardrobeOutfit[]>(`${this.baseUrl}/outfits`, {withCredentials: true});
  }

  createOutfit(payload: WardrobeOutfitCreateRequest): Observable<WardrobeOutfit> {
    return this.http.post<WardrobeOutfit>(`${this.baseUrl}/outfits`, payload, {withCredentials: true});
  }

  updateOutfit(outfitId: string, payload: WardrobeOutfitCreateRequest): Observable<WardrobeOutfit> {
    return this.http.put<WardrobeOutfit>(`${this.baseUrl}/outfits/${encodeURIComponent(outfitId)}`, payload, {withCredentials: true});
  }

  deleteOutfit(outfitId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/outfits/${encodeURIComponent(outfitId)}`, {withCredentials: true});
  }

  wearOutfit(outfitId: string): Observable<WardrobeOutfit> {
    return this.http.post<WardrobeOutfit>(`${this.baseUrl}/outfits/${encodeURIComponent(outfitId)}/wear`, {}, {withCredentials: true});
  }
}
