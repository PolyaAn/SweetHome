import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, map, Observable, tap } from 'rxjs';
import { HomeAssistantWidgetControl, HomeUiState, RoomVm, WidgetVm } from '../../models/home.model';
import { countText, DEVICE_FORMS, SENSOR_FORMS } from '../../utils/home-declension';
import { controlsByType, hasControls, isActiveWidgetState, sliderValue } from '../../utils/home-widget-controls';
import { HomeFacadeService } from '../../services/home-facade.service';
import { SharedService } from '../../../../shared/services/shared.service';

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
    tap((vm) => this.ss.setHomeWidgetCount(vm.widgets.length)),
  );

  constructor(
    private route: ActivatedRoute,
    private facade: HomeFacadeService,
    private ss: SharedService,
  ) {
  }

  ngOnDestroy(): void {
    this.ss.setHomeWidgetCount(null);
  }

  execute(widget: WidgetVm): void {
    this.facade.executeWidgetAction(widget).subscribe();
  }

  executeControl(widget: WidgetVm, control: HomeAssistantWidgetControl): void {
    this.facade.executeWidgetAction(widget, control.action).subscribe();
  }

  changeControl(widget: WidgetVm, control: HomeAssistantWidgetControl, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.facade.executeWidgetAction(widget, control.action, value).subscribe();
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
    return isActiveWidgetState(widget.state);
  }

  value(widget: WidgetVm): string {
    const state = this.formatState(widget.state);
    return widget.unit && state !== '--' ? `${state} ${widget.unit}` : state;
  }

  count(kind: WidgetKind, count: number): string {
    return countText(count, kind === 'sensor' ? SENSOR_FORMS : DEVICE_FORMS);
  }

  emptyText(kind: WidgetKind): string {
    return kind === 'sensor' ? 'Датчики не добавлены' : 'Устройства не добавлены';
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
