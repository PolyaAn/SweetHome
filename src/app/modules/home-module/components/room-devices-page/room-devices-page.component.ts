import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, map, Observable } from 'rxjs';
import { RoomVm, WidgetVm } from '../../models/home.model';
import { HomeFacadeService } from '../../services/home-facade.service';

type Tab = 'all' | 'devices' | 'sensors';
type Vm = {
  room: RoomVm | null;
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
  readonly vm$: Observable<Vm> = combineLatest([
    this.route.paramMap,
    this.facade.dashboard$,
  ]).pipe(
    map(([params, dashboard]) => {
      const roomId = params.get('roomId') ?? '';
      return {
        room: dashboard.rooms.find((room) => room.id === roomId) ?? null,
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
}
