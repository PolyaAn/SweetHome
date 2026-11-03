import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { WardrobeColor, WardrobeItem } from '../../models/wardrobe.model';

@Component({
  selector: 'app-wardrobe-outfit-card',
  templateUrl: './outfit-card.component.html',
  styleUrl: './outfit-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WardrobeOutfitCardComponent {
  @Input() items: WardrobeItem[] = [];
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() score: number | null = null;
  @Input() reasons: string[] = [];
  @Input() colors: WardrobeColor[] = [];

  colorHex(code: string): string | null {
    return this.colors.find((color: WardrobeColor) => color.code === code)?.hex ?? null;
  }

  trackById(_: number, item: WardrobeItem): string {
    return item.id;
  }
}
