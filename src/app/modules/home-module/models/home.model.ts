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
  unit: string | null;
  state: string;
  lastChanged: string;
  lastUpdated: string;
  capabilities: string[];
  attributes: Record<string, unknown>;
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
  updatedAt: string | null;
  capabilities: string[];
}

export interface HomeDashboardVm {
  rooms: RoomVm[];
  widgets: WidgetVm[];
  unassignedWidgets: WidgetVm[];
  visibleRoomCount: number;
  deviceCount: number;
  sensorCount: number;
  hiddenWidgetCount: number;
}

export interface HomeUiState {
  loading: boolean;
  saving: boolean;
  error: string | null;
}
