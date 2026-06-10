import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, map, Observable, tap } from 'rxjs';
import { HomeAssistantCatalogWidget, HomeUiState, RoomVm } from '../../models/home.model';
import { HomeFacadeService } from '../../services/home-facade.service';

@Component({
  selector: 'app-catalog-add-page',
  templateUrl: './catalog-add-page.component.html',
  styleUrl: './catalog-add-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogAddPageComponent {
  readonly routeRoomId = this.route.snapshot.paramMap.get('roomId');
  readonly kind: 'device' | 'sensor' = this.route.snapshot.data['kind'] === 'sensor' ? 'sensor' : 'device';
  readonly uiState$: Observable<HomeUiState> = this.facade.uiState$;
  selectedRoomId: string | null = this.routeRoomId;
  readonly rooms$: Observable<RoomVm[]> = this.facade.dashboard$.pipe(
    map((dashboard) => dashboard.rooms),
    tap((rooms) => {
      if (!this.routeRoomId && !this.selectedRoomId && rooms.length) {
        this.selectedRoomId = rooms[0].id;
      }
    }),
  );
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

  selectRoom(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedRoomId = value || null;
  }

  add(item: HomeAssistantCatalogWidget): void {
    const targetRoomId = this.routeRoomId ?? this.selectedRoomId;

    this.facade.addWidgetToRoom(targetRoomId, item).subscribe(() => {
      if (this.routeRoomId) {
        this.router.navigate(['/home/rooms', this.routeRoomId]);
        return;
      }

      this.router.navigate([this.kind === 'sensor' ? '/home/sensors' : '/home/devices']);
    });
  }
}
