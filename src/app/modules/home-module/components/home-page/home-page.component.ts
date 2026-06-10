import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { HomeDashboardVm, HomeUiState, WidgetVm } from '../../models/home.model';
import { HomeFacadeService } from '../../services/home-facade.service';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  readonly dashboard$: Observable<HomeDashboardVm> = this.facade.dashboard$;
  readonly uiState$: Observable<HomeUiState> = this.facade.uiState$;
  readonly menuItems = [
    {label: 'Комнаты', caption: 'комнат', icon: 'meeting_room', route: '/home/rooms', color: 'orange', countKey: 'visibleRoomCount'},
    {label: 'Устройства', caption: 'устройства', icon: 'power', route: '/home/rooms', color: 'blue', countKey: 'deviceCount'},
    {label: 'Датчики', caption: 'датчиков', icon: 'sensors', route: '/home/rooms', color: 'cyan', countKey: 'sensorCount'},
    {label: 'Сценарии', caption: 'сценариев', icon: 'play_circle', route: '/home/scenarios', color: 'gold'},
    {label: 'Автоматизации', caption: 'правил', icon: 'rule', route: '/home/automations', color: 'green'},
    {label: 'Журнал событий', caption: 'Сегодня', icon: 'history', route: '/home/events', color: 'orange'},
    {label: 'Настройки дома', caption: 'Пользователи, хабы, интеграции', icon: 'settings', route: '/home/rooms', color: 'orange'},
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

  menuCaption(item: {caption: string; countKey?: string}, dashboard: HomeDashboardVm): string {
    if (!item.countKey) {
      return item.caption;
    }

    const count = dashboard[item.countKey as keyof HomeDashboardVm];
    return `${count} ${item.caption}`;
  }
}
