import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, map, Observable } from 'rxjs';
import { HomeAssistantCatalogWidget, HomeUiState } from '../../models/home.model';
import { HomeFacadeService } from '../../services/home-facade.service';

@Component({
  selector: 'app-catalog-add-page',
  templateUrl: './catalog-add-page.component.html',
  styleUrl: './catalog-add-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogAddPageComponent {
  readonly roomId = this.route.snapshot.paramMap.get('roomId');
  readonly kind: 'device' | 'sensor' = this.route.snapshot.data['kind'] === 'sensor' ? 'sensor' : 'device';
  readonly uiState$: Observable<HomeUiState> = this.facade.uiState$;
  readonly items$: Observable<HomeAssistantCatalogWidget[]> = combineLatest([
    this.facade.catalog$,
    this.facade.layout$,
  ]).pipe(
    map(() => this.facade.getCatalogForKind(this.kind)),
  );

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private facade: HomeFacadeService,
  ) {
  }

  add(item: HomeAssistantCatalogWidget): void {
    this.facade.addWidgetToRoom(this.roomId, item).subscribe(() => {
      if (this.roomId) {
        this.router.navigate(['/home/rooms', this.roomId]);
        return;
      }

      this.router.navigate([this.kind === 'sensor' ? '/home/sensors' : '/home/devices']);
    });
  }
}
