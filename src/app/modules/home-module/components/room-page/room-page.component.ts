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
  metrics: {
    temperature: WidgetVm | null;
    humidity: WidgetVm | null;
    illuminance: WidgetVm | null;
  };
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
        metrics: {
          temperature: this.findSensor(widgets, ['temperature', 'температура']),
          humidity: this.findSensor(widgets, ['humidity', 'влажность']),
          illuminance: this.findSensor(widgets, ['illuminance', 'освещ', 'light_level']),
        },
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

  value(widget: WidgetVm | null): string {
    if (!widget) {
      return '—';
    }

    return `${widget.state}${widget.unit ? ' ' + widget.unit : ''}`;
  }

  isOn(widget: WidgetVm): boolean {
    return widget.state === 'on' || widget.state === 'open' || widget.state === 'playing';
  }

  sensorTrend(sensor: WidgetVm): string {
    const seed = sensor.entityId.length % 5;
    const points = [
      2 + seed,
      8,
      7 + seed,
      13,
      9,
      11 + seed,
      6,
      10,
      8 + seed,
    ];

    return points.map((value, index) => `${index * 8},${20 - value}`).join(' ');
  }

  private findSensor(widgets: WidgetVm[], markers: string[]): WidgetVm | null {
    return widgets.find((widget) => {
      const source = `${widget.name} ${widget.entityId}`.toLowerCase();
      return widget.isSensor && markers.some((marker) => source.includes(marker));
    }) ?? null;
  }
}
