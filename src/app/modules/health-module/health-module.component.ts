import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-health-module',
  templateUrl: './health-module.component.html',
  styleUrl: './health-module.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HealthModuleComponent {
}
