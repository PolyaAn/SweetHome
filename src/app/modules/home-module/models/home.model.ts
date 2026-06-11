export type HomeWidgetType =
  | 'light'
  | 'switch'
  | 'sensor'
  | 'binary_sensor'
  | 'climate'
  | 'cover'
  | 'scene'
  | 'script'
  | 'media_player'
  | string;

export interface SmartHomeLayout {
  rooms: SmartHomeRoom[];
  widgets: SmartHomeWidget[];
}

export interface SmartHomeRoom {
  id: string;
  name: string;
  icon: string;
  order: number;
  hide: boolean;
}

export interface SmartHomeWidget {
  id: string;
  entityId: string;
  type: HomeWidgetType;
  name: string;
  icon: string;
  order: number;
  size: number;
  hide: boolean;
  roomId?: string | null;
  settingsJson?: string | null;
}

export interface HomeAssistantCatalogWidget {
  id: string;
  type: HomeWidgetType;
  name: string;
  icon: string;
  source: 'homeAssistant';
  displayType:
    | 'toggleSlider'
    | 'toggle'
    | 'value'
    | 'status'
    | 'thermostat'
    | 'cover'
    | 'actionButton'
    | 'mediaControls'
    | string;
  unit: string | null;
  state: string;
  lastChanged: string;
  lastUpdated: string;
  capabilities: string[];
  controls: HomeAssistantWidgetControl[];
  attributes: Record<string, unknown>;
}

export interface HomeAssistantWidgetControl {
  type: 'button' | 'toggle' | 'slider' | 'colorPicker' | 'stepper' | string;
  action: string;
  label: string;
  min?: number | null;
  max?: number | null;
  step?: number | null;
  unit?: string | null;
}

export interface HomeAssistantActionRequest {
  entityId: string;
  action: string;
  value?: number | string | boolean | null;
}

export interface SmartHomeScenarioAction {
  entityId: string;
  action: string;
  value?: number | string | boolean | null;
}

export interface SmartHomeScenario {
  id: string;
  name: string;
  icon: string;
  actions: SmartHomeScenarioAction[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface SmartHomeAutomation {
  id: string;
  name: string;
  enabled: boolean;
  trigger: Record<string, unknown>;
  conditions: Array<Record<string, unknown>>;
  actions: SmartHomeScenarioAction[];
  createdAt?: string | null;
  updatedAt?: string | null;
  lastExecutedAt?: string | null;
}

export interface SmartHomeEvent {
  id: string;
  type: string;
  title: string;
  message: string;
  entityId?: string | null;
  roomId?: string | null;
  payload?: Record<string, unknown> | null;
  createdAt: string;
}

export interface HomeRealtimeMessage {
  type: 'DEVICE_STATE_CHANGED' | 'NEW_EVENT' | 'ROOM_UPDATED' | string;
  occurredAt: string;
  payload?: SmartHomeEvent | Record<string, unknown> | null;
}

export interface RoomVm extends SmartHomeRoom {
  deviceCount: number;
  sensorCount: number;
  hiddenWidgetCount: number;
  summary: string;
}

export interface WidgetVm extends SmartHomeWidget {
  state: string;
  unit: string | null;
  isSensor: boolean;
  isOnline: boolean;
  catalogMatched: boolean;
  updatedAt: string | null;
  capabilities: string[];
  controls: HomeAssistantWidgetControl[];
  displayType: string | null;
  attributes: Record<string, unknown>;
}

export interface HomeDashboardVm {
  allRooms: RoomVm[];
  rooms: RoomVm[];
  widgets: WidgetVm[];
  unassignedWidgets: WidgetVm[];
  visibleRoomCount: number;
  deviceCount: number;
  sensorCount: number;
  hiddenWidgetCount: number;
  scenarioCount: number;
  automationCount: number;
  eventCount: number;
}

export interface HomeUiState {
  loading: boolean;
  saving: boolean;
  error: string | null;
}
