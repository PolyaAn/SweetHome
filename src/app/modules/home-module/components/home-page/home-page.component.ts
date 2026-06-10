import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { HomeDashboardVm, HomeUiState } from '../../models/home.model';
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

  constructor(private facade: HomeFacadeService) {
  }

  reload(): void {
    this.facade.load().subscribe();
  }
}
