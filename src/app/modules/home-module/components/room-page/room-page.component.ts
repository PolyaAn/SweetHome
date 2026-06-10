import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, map, Observable } from 'rxjs';
import { RoomVm, WidgetVm } from '../../models/home.model';
import { HomeFacadeService } from '../../services/home-facade.service';

type RoomPageVm = {
  room: RoomVm | null;
  widgets: WidgetVm[];
  devices: WidgetVm[];
  sensors: WidgetVm[];
};

@Component({
  selector: 'app-room-page',
  templateUrl: './room-page.component.html',
  styleUrl: './room-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomPageComponent {
  readonly vm$: Observable<RoomPageVm> = combineLatest([
    this.route.paramMap,
    this.facade.dashboard$,
  ]).pipe(
    map(([params, dashboard]) => {
      const roomId = params.get('roomId') ?? '';
      const room = dashboard.rooms.find((item) => item.id === roomId) ?? null;
      const widgets = dashboard.widgets
        .filter((widget) => widget.roomId === roomId && !widget.hide)
        .sort((a, b) => a.order - b.order);

      return {
        room,
        widgets,
        devices: widgets.filter((widget) => !widget.isSensor),
        sensors: widgets.filter((widget) => widget.isSensor),
      };
    }),
  );

  constructor(
    private route: ActivatedRoute,
    private facade: HomeFacadeService,
  ) {
  }

  removeWidget(widget: WidgetVm): void {
    this.facade.removeWidget(widget.id).subscribe();
  }
}
