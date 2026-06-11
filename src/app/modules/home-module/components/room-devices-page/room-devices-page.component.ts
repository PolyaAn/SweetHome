import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, map, Observable } from 'rxjs';
import { HomeUiState, RoomVm, WidgetVm } from '../../models/home.model';
import { HomeFacadeService } from '../../services/home-facade.service';

type Tab = 'all' | 'devices' | 'sensors';
type Vm = {
  room: RoomVm | null;
  rooms: RoomVm[];
  widgets: WidgetVm[];
};

@Component({
  selector: 'app-room-devices-page',
  templateUrl: './room-devices-page.component.html',
  styleUrl: './room-devices-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomDevicesPageComponent {
  selectedTab: Tab = 'all';
  readonly uiState$: Observable<HomeUiState> = this.facade.uiState$;
  readonly vm$: Observable<Vm> = combineLatest([
    this.route.paramMap,
    this.facade.dashboard$,
  ]).pipe(
    map(([params, dashboard]) => {
      const roomId = params.get('roomId') ?? '';
      return {
        room: dashboard.rooms.find((room) => room.id === roomId) ?? null,
        rooms: dashboard.allRooms,
        widgets: dashboard.widgets.filter((widget) => widget.roomId === roomId && !widget.hide),
      };
    }),
  );

  constructor(
    private route: ActivatedRoute,
    private facade: HomeFacadeService,
  ) {
  }

  setTab(tab: Tab): void {
    this.selectedTab = tab;
  }

  filtered(widgets: WidgetVm[]): WidgetVm[] {
    if (this.selectedTab === 'devices') {
      return widgets.filter((widget) => !widget.isSensor);
    }

    if (this.selectedTab === 'sensors') {
      return widgets.filter((widget) => widget.isSensor);
    }

    return widgets;
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
    const roomId = widget.roomId?.trim();
    return !!roomId && !rooms.some((room) => room.id.trim() === roomId);
  }
}
