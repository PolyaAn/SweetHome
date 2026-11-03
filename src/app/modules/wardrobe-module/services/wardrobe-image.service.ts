import { Injectable, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { catchError, filter, finalize, map, Observable, of, shareReplay, Subscription } from 'rxjs';
import { WardrobeImageVariant, WardrobeItem } from '../models/wardrobe.model';
import { WardrobeApiService } from './wardrobe-api.service';

/**
 * Фото вещей защищены cookie-авторизацией, поэтому грузим их через HttpClient
 * и отдаём в шаблон object URL. Кэш живёт, пока открыт модуль гардероба.
 */
@Injectable()
export class WardrobeImageService implements OnDestroy {
  private readonly urls: Map<string, string> = new Map();
  private readonly pending: Map<string, Observable<string | null>> = new Map();

  private readonly navigation: Subscription;

  constructor(
    private api: WardrobeApiService,
    router: Router,
  ) {
    // Сервис живёт в ленивом модуле, который Angular не уничтожает: освобождаем фото, когда уходим из гардероба.
    this.navigation = router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        if (!event.urlAfterRedirects.startsWith('/wardrobe')) {
          this.clear();
        }
      });
  }

  /** Без variant — версия, выбранная для показа; явный variant нужен, например, чтобы взять цвет с оригинала. */
  getUrl(item: Pick<WardrobeItem, 'id' | 'hasImage' | 'imageUpdatedAt'>, variant?: WardrobeImageVariant): Observable<string | null> {
    if (!item.hasImage) {
      return of(null);
    }

    const key: string = this.key(item, variant);
    const cached: string | undefined = this.urls.get(key);
    if (cached) {
      return of(cached);
    }

    const inFlight: Observable<string | null> | undefined = this.pending.get(key);
    if (inFlight) {
      return inFlight;
    }

    const request$: Observable<string | null> = this.api.getImageBlob(item, variant).pipe(
      map((blob: Blob) => {
        this.revokeOlderVersions(item.id, item.imageUpdatedAt);
        const url: string = URL.createObjectURL(blob);
        this.urls.set(key, url);
        return url;
      }),
      catchError(() => of(null)),
      finalize(() => this.pending.delete(key)),
      shareReplay(1),
    );

    this.pending.set(key, request$);
    return request$;
  }

  /** Подставляет только что выбранное фото, чтобы не скачивать его заново после загрузки. */
  prime(item: Pick<WardrobeItem, 'id' | 'imageUpdatedAt'>, blob: Blob): void {
    this.revokeOlderVersions(item.id);
    this.urls.set(this.key(item), URL.createObjectURL(blob));
  }

  forget(itemId: string): void {
    this.revokeOlderVersions(itemId);
  }

  ngOnDestroy(): void {
    this.navigation.unsubscribe();
    this.clear();
  }

  private clear(): void {
    this.urls.forEach((url: string) => URL.revokeObjectURL(url));
    this.urls.clear();
  }

  private key(item: Pick<WardrobeItem, 'id' | 'imageUpdatedAt'>, variant?: WardrobeImageVariant): string {
    return `${item.id}|${item.imageUpdatedAt || ''}|${variant || ''}`;
  }

  /** Освобождает фото вещи других версий (keepVersion — оставить все варианты этой версии). */
  private revokeOlderVersions(itemId: string, keepVersion?: string | null): void {
    Array.from(this.urls.keys())
      .filter((key: string) => key.startsWith(`${itemId}|`)
        && (keepVersion === undefined || !key.startsWith(`${itemId}|${keepVersion || ''}|`)))
      .forEach((key: string) => {
        URL.revokeObjectURL(this.urls.get(key) as string);
        this.urls.delete(key);
      });
  }
}
