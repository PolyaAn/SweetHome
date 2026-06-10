import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { HomeDashboardVm, RoomVm, WidgetVm } from '../../models/home.model';
import { HomeFacadeService } from '../../services/home-facade.service';

@Component({
  selector: 'app-rooms-page',
  templateUrl: './rooms-page.component.html',
  styleUrl: './rooms-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomsPageComponent {
  readonly dashboard$: Observable<HomeDashboardVm> = this.facade.dashboard$;

  constructor(private facade: HomeFacadeService) {
  }

  roomTemperature(room: RoomVm, widgets: WidgetVm[]): string {
    const sensor = widgets.find((widget) => {
      const name = `${widget.name} ${widget.entityId}`.toLowerCase();
      return widget.roomId === room.id && name.includes('temperature');
    });

    return sensor ? `${sensor.state}${sensor.unit ? ' ' + sensor.unit : ''}` : '—';
  }
}
