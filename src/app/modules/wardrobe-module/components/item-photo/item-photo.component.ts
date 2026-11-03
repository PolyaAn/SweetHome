import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { WARDROBE_CATEGORY_ICONS, WardrobeCategory, WardrobeItem } from '../../models/wardrobe.model';
import { WardrobeImageService } from '../../services/wardrobe-image.service';

@Component({
  selector: 'app-wardrobe-item-photo',
  templateUrl: './item-photo.component.html',
  styleUrl: './item-photo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WardrobeItemPhotoComponent implements OnChanges, OnDestroy {
  @Input() item: Pick<WardrobeItem, 'id' | 'hasImage' | 'imageUpdatedAt' | 'category' | 'name' | 'colors'> | null = null;
  /** Локальное превью (например, только что выбранное фото) важнее серверного. */
  @Input() previewUrl: string | null = null;
  @Input() category: WardrobeCategory | null = null;
  @Input() accentHex: string | null = null;

  url: string | null = null;
  loading: boolean = false;
  private subscription?: Subscription;

  constructor(
    private images: WardrobeImageService,
    private cdr: ChangeDetectorRef,
  ) {
  }

  get icon(): string {
    const category: WardrobeCategory | null = this.category ?? this.item?.category ?? null;
    return category ? WARDROBE_CATEGORY_ICONS[category] : 'checkroom';
  }

  get displayUrl(): string | null {
    return this.previewUrl || this.url;
  }

  ngOnChanges(): void {
    this.subscription?.unsubscribe();
    this.url = null;

    if (this.previewUrl || !this.item?.hasImage) {
      this.loading = false;
      return;
    }

    this.loading = true;
    this.subscription = this.images.getUrl(this.item).subscribe((url: string | null) => {
      this.url = url;
      this.loading = false;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
