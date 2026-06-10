import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { HomeDashboardVm } from '../../models/home.model';
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
}
