import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, map, Observable, tap } from 'rxjs';
import { HomeAssistantWidgetControl, HomeUiState, RoomVm, WidgetVm } from '../../models/home.model';
import { countText, DEVICE_FORMS, SENSOR_FORMS } from '../../utils/home-declension';
import { controlsByType, hasControls, isActiveWidgetState, sliderValue } from '../../utils/home-widget-controls';
import { HomeFacadeService } from '../../services/home-facade.service';
import { SharedService } from '../../../../shared/services/shared.service';

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
  readonly uiState$: Observable<HomeUiState> = this.facade.uiState$;
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
    tap((vm) => this.sharedService.setHomeRoomTitle(vm.room?.name ?? '')),
  );

  constructor(
    private route: ActivatedRoute,
    private facade: HomeFacadeService,
    private sharedService: SharedService,
  ) {
  }

  executeControl(device: WidgetVm, control: HomeAssistantWidgetControl): void {
    this.facade.executeWidgetAction(device, control.action).subscribe();
  }

  changeControl(device: WidgetVm, control: HomeAssistantWidgetControl, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.facade.executeWidgetAction(device, control.action, value).subscribe();
  }

  buttonControls(widget: WidgetVm): HomeAssistantWidgetControl[] {
    return controlsByType(widget, 'button');
  }

  toggleControls(widget: WidgetVm): HomeAssistantWidgetControl[] {
    return controlsByType(widget, 'toggle');
  }

  sliderControls(widget: WidgetVm): HomeAssistantWidgetControl[] {
    return controlsByType(widget, 'slider');
  }

  hasControls(widget: WidgetVm): boolean {
    return hasControls(widget);
  }

  sliderValue(widget: WidgetVm, control: HomeAssistantWidgetControl): number {
    return sliderValue(widget, control);
  }

  value(widget: WidgetVm | null): string {
    const state = this.formatState(widget?.state);
    return widget && widget.unit && state !== '--' ? `${state} ${widget.unit}` : state;
  }

  displayName(widget: WidgetVm): string {
    const source = `${widget.name} ${widget.entityId}`.toLowerCase();

    if (source.includes('curtain')) {
      return 'Умные шторы';
    }

    if (source.includes('blind')) {
      return 'Умные жалюзи';
    }

    return widget.name;
  }

  controlLabel(control: HomeAssistantWidgetControl): string {
    const value = (control.label || control.action).toLowerCase();
    const labelMap: Record<string, string> = {
      open: 'Открыть',
      close: 'Закрыть',
      position: 'Положение',
      toggle: 'Переключить',
      turnon: 'Включить',
      turnoff: 'Выключить',
      stop: 'Стоп',
    };

    return labelMap[value.replace(/\s+/g, '')] ?? control.label;
  }

  isOn(widget: WidgetVm): boolean {
    return isActiveWidgetState(widget.state);
  }

  isCover(widget: WidgetVm): boolean {
    return widget.type === 'cover' || widget.displayType === 'cover';
  }

  devicesCount(count: number): string {
    return countText(count, DEVICE_FORMS);
  }

  sensorsCount(count: number): string {
    return countText(count, SENSOR_FORMS);
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

  formatState(state: string | null | undefined): string {
    if (!state || state === 'unknown') {
      return '--';
    }

    const normalized = state.toLowerCase();
    const stateMap: Record<string, string> = {
      on: 'Включено',
      off: 'Выключено',
      open: 'Открыто',
      closed: 'Закрыто',
      opening: 'Открывается',
      closing: 'Закрывается',
      unavailable: 'Недоступно',
    };

    return stateMap[normalized] ?? state;
  }

  private findSensor(widgets: WidgetVm[], markers: string[]): WidgetVm | null {
    return widgets.find((widget) => {
      const source = `${widget.name} ${widget.entityId}`.toLowerCase();
      return widget.isSensor && markers.some((marker) => source.includes(marker));
    }) ?? null;
  }
}
