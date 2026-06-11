import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, combineLatest, finalize, map, Observable, of, switchMap, tap } from 'rxjs';
import {
  HomeAssistantCatalogWidget,
  HomeDashboardVm,
  HomeUiState,
  RoomVm,
  SmartHomeAutomation,
  SmartHomeEvent,
  SmartHomeLayout,
  SmartHomeRoom,
  SmartHomeScenario,
  SmartHomeWidget,
  WidgetVm,
} from '../models/home.model';
import { countText, DEVICE_FORMS, SENSOR_FORMS } from '../utils/home-declension';
import { isActiveWidgetState } from '../utils/home-widget-controls';
import { HomeApiService } from './home-api.service';
import { HomeRealtimeService } from './home-realtime.service';

const EMPTY_LAYOUT: SmartHomeLayout = {
  rooms: [],
  widgets: [],
};
const ERROR_VISIBLE_TIMEOUT_MS = 40000;

@Injectable()
export class HomeFacadeService {
  private readonly layoutSubject = new BehaviorSubject<SmartHomeLayout>(EMPTY_LAYOUT);
  private readonly catalogSubject = new BehaviorSubject<HomeAssistantCatalogWidget[]>([]);
  private readonly scenariosSubject = new BehaviorSubject<SmartHomeScenario[]>([]);
  private readonly automationsSubject = new BehaviorSubject<SmartHomeAutomation[]>([]);
  private readonly eventsSubject = new BehaviorSubject<SmartHomeEvent[]>([]);
  private readonly uiStateSubject = new BehaviorSubject<HomeUiState>({
    loading: false,
    saving: false,
    error: null,
  });
  private errorClearTimer: ReturnType<typeof setTimeout> | null = null;

  readonly layout$ = this.layoutSubject.asObservable();
  readonly catalog$ = this.catalogSubject.asObservable();
  readonly scenarios$ = this.scenariosSubject.asObservable();
  readonly automations$ = this.automationsSubject.asObservable();
  readonly events$ = this.eventsSubject.asObservable();
  readonly uiState$ = this.uiStateSubject.asObservable();

  readonly dashboard$: Observable<HomeDashboardVm> = combineLatest([
    this.layout$,
    this.catalog$,
    this.scenarios$,
    this.automations$,
    this.events$,
  ]).pipe(
    map(([layout, catalog, scenarios, automations, events]) => this.buildDashboard(layout, catalog, scenarios, automations, events)),
  );

  constructor(
    private api: HomeApiService,
    private realtime: HomeRealtimeService,
  ) {
    this.realtime.connect();
    this.realtime.messages$
      .subscribe((message) => {
        if (message.type === 'DEVICE_STATE_CHANGED' || message.type === 'ROOM_UPDATED' || message.type === 'NEW_EVENT') {
          this.load().subscribe();
        }
      });
  }

  load(): Observable<SmartHomeLayout> {
    this.patchState({loading: true, error: null});

    return combineLatest([
      this.api.getLayout().pipe(catchError(() => of(EMPTY_LAYOUT))),
      this.api.getCatalog().pipe(catchError(() => of([]))),
      this.api.getScenarios().pipe(catchError(() => of([]))),
      this.api.getAutomations().pipe(catchError(() => of([]))),
      this.api.getEvents().pipe(catchError(() => of([]))),
    ]).pipe(
      tap(([layout, catalog, scenarios, automations, events]) => {
        this.layoutSubject.next(this.normalizeLayout(layout));
        this.catalogSubject.next(catalog);
        this.scenariosSubject.next(scenarios);
        this.automationsSubject.next(automations);
        this.eventsSubject.next(events);
      }),
      map(([layout]) => layout),
      catchError(() => {
        this.patchState({error: 'Не удалось загрузить данные умного дома'});
        return of(EMPTY_LAYOUT);
      }),
      finalize(() => this.patchState({loading: false})),
    );
  }

  getRoom(roomId: string): RoomVm | null {
    return this.buildDashboard(
      this.layoutSubject.value,
      this.catalogSubject.value,
      this.scenariosSubject.value,
      this.automationsSubject.value,
      this.eventsSubject.value,
    )
      .rooms
      .find((room) => room.id === roomId) ?? null;
  }

  getRoomWidgets(roomId: string): WidgetVm[] {
    return this.buildDashboard(
      this.layoutSubject.value,
      this.catalogSubject.value,
      this.scenariosSubject.value,
      this.automationsSubject.value,
      this.eventsSubject.value,
    )
      .widgets
      .filter((widget) => widget.roomId === roomId && !widget.hide)
      .sort((a, b) => a.order - b.order);
  }

  getCatalogForKind(kind: 'device' | 'sensor'): HomeAssistantCatalogWidget[] {
    const existing = new Set(this.layoutSubject.value.widgets.map((widget) => widget.entityId));
    return this.catalogSubject.value
      .filter((item) => kind === 'sensor' ? this.isSensorType(item.type) : !this.isSensorType(item.type))
      .filter((item) => !existing.has(item.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  createRoom(name: string, icon: string): Observable<void> {
    const layout = this.layoutSubject.value;
    const nextRoom: SmartHomeRoom = {
      id: this.createId(),
      name: name.trim(),
      icon,
      order: this.nextOrder(layout.rooms),
      hide: false,
    };

    return this.save({
      ...layout,
      rooms: [...layout.rooms, nextRoom],
    });
  }

  updateRoom(room: SmartHomeRoom): Observable<void> {
    const layout = this.layoutSubject.value;
    return this.save({
      ...layout,
      rooms: layout.rooms.map((item) => item.id === room.id ? room : item),
    });
  }

  deleteRoom(roomId: string): Observable<void> {
    const layout = this.layoutSubject.value;
    return this.save({
      rooms: layout.rooms.filter((room) => room.id !== roomId),
      widgets: layout.widgets.map((widget) => widget.roomId === roomId ? {...widget, roomId: null} : widget),
    });
  }

  addWidgetToRoom(roomId: string | null, catalogWidget: HomeAssistantCatalogWidget): Observable<void> {
    const layout = this.layoutSubject.value;
    const nextWidget: SmartHomeWidget = {
      id: this.createId(),
      entityId: catalogWidget.id,
      type: catalogWidget.type,
      name: catalogWidget.name,
      icon: catalogWidget.icon,
      order: this.nextOrder(layout.widgets.filter((widget) => (widget.roomId ?? null) === roomId)),
      size: 1,
      hide: false,
      roomId,
      settingsJson: '{}',
    };

    return this.save({
      ...layout,
      widgets: [...layout.widgets, nextWidget],
    });
  }

  removeWidget(widgetId: string): Observable<void> {
    const layout = this.layoutSubject.value;
    return this.save({
      ...layout,
      widgets: layout.widgets.filter((widget) => widget.id !== widgetId),
    });
  }

  setWidgetRoom(widgetId: string, roomId: string | null): Observable<void> {
    const layout = this.layoutSubject.value;
    return this.save({
      ...layout,
      widgets: layout.widgets.map((widget) => widget.id === widgetId ? {
        ...widget,
        roomId,
      } : widget),
    });
  }

  updateWidget(widget: SmartHomeWidget): Observable<void> {
    const layout = this.layoutSubject.value;
    return this.save({
      ...layout,
      widgets: layout.widgets.map((item) => item.id === widget.id ? widget : item),
    });
  }

  executeWidgetAction(widget: WidgetVm, action?: string, value?: number | string | null): Observable<void> {
    const selectedAction = action ?? this.defaultAction(widget);

    if (!selectedAction) {
      this.patchState({error: 'Для устройства нет доступного действия'});
      return of(void 0);
    }

    this.patchState({saving: true, error: null});

    return this.api.executeAction({
      entityId: widget.entityId,
      action: selectedAction,
      value,
    }).pipe(
      switchMap(() => this.load()),
      map(() => void 0),
      catchError(() => {
        this.patchState({error: 'Не удалось выполнить действие устройства'});
        return of(void 0);
      }),
      finalize(() => this.patchState({saving: false})),
    );
  }

  defaultAction(widget: WidgetVm): string | null {
    const actions = new Set(widget.controls.map((control) => control.action));

    if (widget.type === 'cover') {
      if (isActiveWidgetState(widget.state) && actions.has('close')) {
        return 'close';
      }

      if (actions.has('open')) {
        return 'open';
      }

      return actions.has('toggle') ? 'toggle' : null;
    }

    if (actions.has('toggle')) {
      return 'toggle';
    }

    if (isActiveWidgetState(widget.state) && actions.has('turnOff')) {
      return 'turnOff';
    }

    if (actions.has('turnOn')) {
      return 'turnOn';
    }

    return widget.controls.find((control) => control.type === 'button')?.action ?? null;
  }

  private save(layout: SmartHomeLayout): Observable<void> {
    const normalized = this.normalizeLayout(layout);
    this.patchState({saving: true, error: null});

    return this.api.saveLayout(normalized).pipe(
      tap(() => this.layoutSubject.next(normalized)),
      catchError(() => {
        this.patchState({error: 'Не удалось сохранить изменения'});
        return of(void 0);
      }),
      finalize(() => this.patchState({saving: false})),
    );
  }

  private buildDashboard(
    layout: SmartHomeLayout,
    catalog: HomeAssistantCatalogWidget[],
    scenarios: SmartHomeScenario[],
    automations: SmartHomeAutomation[],
    events: SmartHomeEvent[],
  ): HomeDashboardVm {
    const catalogById = new Map(catalog.map((item) => [item.id, item]));
    const widgets = layout.widgets
      .map((widget) => this.buildWidgetVm(widget, catalogById.get(widget.entityId)))
      .sort((a, b) => a.order - b.order);
    const allRooms = layout.rooms
      .sort((a, b) => a.order - b.order)
      .map((room) => this.buildRoomVm(room, widgets));
    const rooms = allRooms.filter((room) => !room.hide);
    const unassignedWidgets = widgets.filter((widget) => !widget.roomId && !widget.hide);

    return {
      allRooms,
      rooms,
      widgets,
      unassignedWidgets,
      visibleRoomCount: rooms.length,
      deviceCount: widgets.filter((widget) => !widget.isSensor && !widget.hide).length,
      sensorCount: widgets.filter((widget) => widget.isSensor && !widget.hide).length,
      hiddenWidgetCount: widgets.filter((widget) => widget.hide).length,
      scenarioCount: scenarios.length,
      automationCount: automations.length,
      eventCount: events.length,
    };
  }

  private buildRoomVm(room: SmartHomeRoom, widgets: WidgetVm[]): RoomVm {
    const roomWidgets = widgets.filter((widget) => widget.roomId === room.id && !widget.hide);
    const deviceCount = roomWidgets.filter((widget) => !widget.isSensor).length;
    const sensorCount = roomWidgets.filter((widget) => widget.isSensor).length;

    return {
      ...room,
      deviceCount,
      sensorCount,
      hiddenWidgetCount: widgets.filter((widget) => widget.roomId === room.id && widget.hide).length,
      summary: `${countText(deviceCount, DEVICE_FORMS)} | ${countText(sensorCount, SENSOR_FORMS)}`,
    };
  }

  private buildWidgetVm(widget: SmartHomeWidget, catalogItem?: HomeAssistantCatalogWidget): WidgetVm {
    const state = catalogItem?.state ?? 'unknown';
    return {
      ...widget,
      type: catalogItem?.type ?? widget.type,
      state,
      unit: catalogItem?.unit ?? null,
      isSensor: this.isSensorType(catalogItem?.type ?? widget.type),
      isOnline: state !== 'unavailable' && state !== 'unknown',
      catalogMatched: !!catalogItem,
      updatedAt: catalogItem?.lastUpdated ?? null,
      capabilities: catalogItem?.capabilities ?? [],
      controls: catalogItem?.controls ?? [],
      displayType: catalogItem?.displayType ?? null,
      attributes: catalogItem?.attributes ?? {},
    };
  }

  private normalizeLayout(layout: SmartHomeLayout | null | undefined): SmartHomeLayout {
    return {
      rooms: [...(layout?.rooms ?? [])]
        .map((room) => ({...room, id: room.id.trim()}))
        .sort((a, b) => a.order - b.order),
      widgets: [...(layout?.widgets ?? [])]
        .map((widget) => ({...widget, roomId: widget.roomId?.trim() || null}))
        .sort((a, b) => a.order - b.order),
    };
  }

  private patchState(patch: Partial<HomeUiState>): void {
    this.uiStateSubject.next({
      ...this.uiStateSubject.value,
      ...patch,
    });

    if (Object.prototype.hasOwnProperty.call(patch, 'error')) {
      this.scheduleErrorClear(patch.error ?? null);
    }
  }

  private scheduleErrorClear(error: string | null): void {
    this.clearErrorTimer();

    if (!error) {
      return;
    }

    this.errorClearTimer = setTimeout(() => {
      this.errorClearTimer = null;
      this.uiStateSubject.next({
        ...this.uiStateSubject.value,
        error: null,
      });
    }, ERROR_VISIBLE_TIMEOUT_MS);
  }

  private clearErrorTimer(): void {
    if (!this.errorClearTimer) {
      return;
    }

    clearTimeout(this.errorClearTimer);
    this.errorClearTimer = null;
  }

  private nextOrder(items: Array<{ order: number }>): number {
    return items.length ? Math.max(...items.map((item) => item.order)) + 1 : 1;
  }

  private isSensorType(type: string): boolean {
    return type === 'sensor' || type === 'binary_sensor';
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
