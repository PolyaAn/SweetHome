import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

type UnsupportedFeature = {
  title: string;
  icon: string;
  description: string;
  endpoints: string[];
};

const FEATURES: Record<string, UnsupportedFeature> = {
  scenarios: {
    title: 'Сценарии',
    icon: 'play_circle',
    description: 'Список сценариев и запуск сценария отсутствуют в текущем API.',
    endpoints: ['GET /api/v1/home/scenarios', 'POST /api/v1/home/scenarios/{scenarioId}/execute'],
  },
  scenarioCreate: {
    title: 'Создание сценария',
    icon: 'playlist_add',
    description: 'Создание сценария отсутствует в текущем API.',
    endpoints: ['POST /api/v1/home/scenarios'],
  },
  automations: {
    title: 'Автоматизации',
    icon: 'rule',
    description: 'Список автоматизаций и переключение активности отсутствуют в текущем API.',
    endpoints: ['GET /api/v1/home/automations', 'PUT /api/v1/home/automations/{automationId}'],
  },
  events: {
    title: 'Журнал событий',
    icon: 'history',
    description: 'Журнал событий и фильтры отсутствуют в текущем API.',
    endpoints: ['GET /api/v1/home/events'],
  },
};

@Component({
  selector: 'app-unsupported-page',
  templateUrl: './unsupported-page.component.html',
  styleUrl: './unsupported-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnsupportedPageComponent {
  readonly feature = FEATURES[this.route.snapshot.data['feature'] as string] ?? FEATURES['events'];

  constructor(private route: ActivatedRoute) {
  }
}
