import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, map, Observable } from 'rxjs';
import { HomeUiState, RoomVm, WidgetVm } from '../../models/home.model';
import { countText, DEVICE_FORMS, SENSOR_FORMS } from '../../utils/home-declension';
import { HomeFacadeService } from '../../services/home-facade.service';

type WidgetKind = 'device' | 'sensor';

@Component({
  selector: 'app-all-widgets-page',
  templateUrl: './all-widgets-page.component.html',
  styleUrl: './all-widgets-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllWidgetsPageComponent {
  readonly uiState$: Observable<HomeUiState> = this.facade.uiState$;
  readonly vm$: Observable<{ kind: WidgetKind; rooms: RoomVm[]; widgets: WidgetVm[] }> = combineLatest([
    this.route.data,
    this.facade.dashboard$,
  ]).pipe(
    map(([data, dashboard]) => {
      const kind = data['kind'] as WidgetKind;
      return {
        kind,
        rooms: dashboard.allRooms,
        widgets: dashboard.widgets
          .filter((widget) => !widget.hide)
          .filter((widget) => kind === 'sensor' ? widget.isSensor : !widget.isSensor)
          .sort((a, b) => a.order - b.order),
      };
    }),
  );

  constructor(
    private route: ActivatedRoute,
    private facade: HomeFacadeService,
  ) {
  }

  execute(widget: WidgetVm): void {
    this.facade.executeWidgetAction(widget).subscribe();
  }

  changeRoom(widgetId: string, roomId: string | null): void {
    this.facade.setWidgetRoom(widgetId, roomId).subscribe();
  }

  remove(widgetId: string): void {
    this.facade.removeWidget(widgetId).subscribe();
  }

  roomIdFromEvent(event: Event): string | null {
    const value = (event.target as HTMLSelectElement).value;
    return value || null;
  }

  selectedRoomMissing(widget: WidgetVm, rooms: RoomVm[]): boolean {
    const roomId = this.normalizeId(widget.roomId);
    return !!roomId && !rooms.some((room) => this.normalizeId(room.id) === roomId);
  }

  selectedRoom(widget: WidgetVm, room: RoomVm): boolean {
    return this.normalizeId(widget.roomId) === this.normalizeId(room.id);
  }

  isOn(widget: WidgetVm): boolean {
    return widget.state === 'on' || widget.state === 'open' || widget.state === 'opening' || widget.state === 'playing';
  }

  value(widget: WidgetVm): string {
    return `${widget.state}${widget.unit ? ' ' + widget.unit : ''}`;
  }

  title(kind: WidgetKind): string {
    return kind === 'sensor' ? 'Датчики' : 'Устройства';
  }

  count(kind: WidgetKind, count: number): string {
    return countText(count, kind === 'sensor' ? SENSOR_FORMS : DEVICE_FORMS);
  }

  emptyText(kind: WidgetKind): string {
    return kind === 'sensor' ? 'Датчики не добавлены' : 'Устройства не добавлены';
  }

  private normalizeId(value: string | null | undefined): string {
    return (value ?? '').trim();
  }
}
