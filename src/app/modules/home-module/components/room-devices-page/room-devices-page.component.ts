import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, map, Observable, tap } from 'rxjs';
import { HomeUiState, RoomVm, WidgetVm } from '../../models/home.model';
import { HomeFacadeService } from '../../services/home-facade.service';
import { SharedService } from '../../../../shared/services/shared.service';

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
    tap((vm) => this.sharedService.setHomeRoomTitle(vm.room?.name ?? '')),
  );

  constructor(
    private route: ActivatedRoute,
    private facade: HomeFacadeService,
    private sharedService: SharedService,
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
    const roomId = this.normalizeId(widget.roomId);
    return !!roomId && !rooms.some((room) => this.normalizeId(room.id) === roomId);
  }

  selectedRoom(widget: WidgetVm, room: RoomVm): boolean {
    return this.normalizeId(widget.roomId) === this.normalizeId(room.id);
  }

  value(widget: WidgetVm): string {
    const state = this.formatState(widget.state);
    return widget.unit && state !== '--' ? `${state} ${widget.unit}` : state;
  }

  private formatState(state: string | null | undefined): string {
    if (!state || state === 'unknown') {
      return '--';
    }

    return state;
  }

  private normalizeId(value: string | null | undefined): string {
    return (value ?? '').trim();
  }
}
