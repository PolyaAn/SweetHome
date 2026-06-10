import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { HomeDashboardVm, HomeUiState, WidgetVm } from '../../models/home.model';
import {
  countText,
  DEVICE_FORMS,
  ROOM_FORMS,
  RULE_FORMS,
  SCENARIO_FORMS,
  SENSOR_FORMS,
  RussianPluralForms,
} from '../../utils/home-declension';
import { HomeFacadeService } from '../../services/home-facade.service';

type MenuItem = {
  label: string;
  icon: string;
  route: string;
  color: string;
  countKey?: keyof HomeDashboardVm;
  forms?: RussianPluralForms;
  caption?: string;
};

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  readonly dashboard$: Observable<HomeDashboardVm> = this.facade.dashboard$;
  readonly uiState$: Observable<HomeUiState> = this.facade.uiState$;
  readonly menuItems: MenuItem[] = [
    {label: 'Комнаты', icon: 'meeting_room', route: '/home/rooms', color: 'orange', countKey: 'visibleRoomCount', forms: ROOM_FORMS},
    {label: 'Устройства', icon: 'power', route: '/home/devices', color: 'blue', countKey: 'deviceCount', forms: DEVICE_FORMS},
    {label: 'Датчики', icon: 'sensors', route: '/home/sensors', color: 'cyan', countKey: 'sensorCount', forms: SENSOR_FORMS},
    {label: 'Сценарии', icon: 'play_circle', route: '/home/scenarios', color: 'gold', caption: countText(0, SCENARIO_FORMS)},
    {label: 'Автоматизации', icon: 'rule', route: '/home/automations', color: 'green', caption: countText(0, RULE_FORMS)},
    {label: 'Журнал событий', icon: 'history', route: '/home/events', color: 'orange', caption: 'Сегодня'},
    {label: 'Настройки дома', icon: 'settings', route: '/home/rooms', color: 'orange', caption: 'Пользователи, хабы, интеграции'},
  ];

  constructor(private facade: HomeFacadeService) {
  }

  reload(): void {
    this.facade.load().subscribe();
  }

  metric(widgets: WidgetVm[], type: 'temperature' | 'humidity' | 'air'): string {
    const match = widgets.find((widget) => {
      const name = `${widget.name} ${widget.entityId}`.toLowerCase();
      return name.includes(type);
    });

    if (!match) {
      return type === 'air' ? 'Отличное' : '—';
    }

    return `${match.state}${match.unit ? ' ' + match.unit : ''}`;
  }

  menuCaption(item: MenuItem, dashboard: HomeDashboardVm): string {
    if (item.countKey && item.forms) {
      const count = Number(dashboard[item.countKey]);
      return countText(count, item.forms);
    }

    return item.caption ?? '';
  }
}
