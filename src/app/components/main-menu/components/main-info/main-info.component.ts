import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-main-info',
  standalone: true,
  templateUrl: './main-info.component.html',
  styleUrl: './main-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainInfoComponent {
}
