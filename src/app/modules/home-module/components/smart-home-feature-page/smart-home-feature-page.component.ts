import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import {
  SmartHomeAutomation,
  SmartHomeEvent,
  SmartHomeScenario,
  SmartHomeScenarioAction,
} from '../../models/home.model';
import { HomeApiService } from '../../services/home-api.service';
import { HomeRealtimeService } from '../../services/home-realtime.service';

type HomeFeature = 'scenarios' | 'scenarioCreate' | 'automations' | 'events';

@Component({
  selector: 'app-smart-home-feature-page',
  templateUrl: './smart-home-feature-page.component.html',
  styleUrl: './smart-home-feature-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmartHomeFeaturePageComponent implements OnInit, OnDestroy {
  readonly scenarioForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    icon: ['play_circle'],
    entityId: [''],
    action: ['turn_on'],
    value: [''],
  });
  readonly automationForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    entityId: [''],
    action: ['turn_on'],
    value: [''],
    triggerEntityId: [''],
    triggerType: ['state'],
  });

  feature: HomeFeature = 'events';
  loading = false;
  saving = false;
  savingId: string | null = null;
  error: string | null = null;
  scenarios: SmartHomeScenario[] = [];
  automations: SmartHomeAutomation[] = [];
  events: SmartHomeEvent[] = [];

  private readonly subscriptions = new Subscription();

  constructor(
    private api: HomeApiService,
    private realtime: HomeRealtimeService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private changeDetector: ChangeDetectorRef,
  ) {
  }

  ngOnInit(): void {
    this.realtime.connect();

    this.subscriptions.add(
      this.route.data.subscribe((data) => {
        this.feature = this.toFeature(data['feature']);
        this.load();
      }),
    );

    this.subscriptions.add(
      this.realtime.messages$.subscribe((message) => {
        const event = this.toEvent(message.payload);

        if (event) {
          this.events = [event, ...this.events.filter((item) => item.id !== event.id)].slice(0, 100);
        }

        if (message.type === 'NEW_EVENT' || message.type === 'ROOM_UPDATED') {
          this.load();
        }

        this.changeDetector.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.changeDetector.markForCheck();

    if (this.feature === 'scenarios' || this.feature === 'scenarioCreate') {
      this.api.getScenarios()
        .pipe(finalize(() => this.finishLoading()))
        .subscribe({
          next: (scenarios) => this.scenarios = scenarios,
          error: () => this.error = 'Не удалось загрузить сценарии',
        });
      return;
    }

    if (this.feature === 'automations') {
      this.api.getAutomations()
        .pipe(finalize(() => this.finishLoading()))
        .subscribe({
          next: (automations) => this.automations = automations,
          error: () => this.error = 'Не удалось загрузить автоматизации',
        });
      return;
    }

    this.api.getEvents()
      .pipe(finalize(() => this.finishLoading()))
      .subscribe({
        next: (events) => this.events = events,
        error: () => this.error = 'Не удалось загрузить журнал событий',
      });
  }

  createScenario(): void {
    if (this.scenarioForm.invalid) {
      this.scenarioForm.markAllAsTouched();
      return;
    }

    const value = this.scenarioForm.getRawValue();
    const scenario: SmartHomeScenario = {
      id: this.createId(),
      name: value.name.trim(),
      icon: value.icon.trim() || 'play_circle',
      actions: this.buildActions(value.entityId, value.action, value.value),
    };

    this.saving = true;
    this.error = null;
    this.api.createScenario(scenario)
      .pipe(finalize(() => this.finishSaving()))
      .subscribe({
        next: () => this.router.navigate(['/home/scenarios']),
        error: () => this.error = 'Не удалось создать сценарий',
      });
  }

  executeScenario(scenario: SmartHomeScenario): void {
    this.savingId = scenario.id;
    this.error = null;
    this.api.executeScenario(scenario.id)
      .pipe(finalize(() => this.finishSaving()))
      .subscribe({
        next: () => this.load(),
        error: () => this.error = 'Не удалось выполнить сценарий',
      });
  }

  createAutomation(): void {
    if (this.automationForm.invalid) {
      this.automationForm.markAllAsTouched();
      return;
    }

    const value = this.automationForm.getRawValue();
    const automation: SmartHomeAutomation = {
      id: this.createId(),
      name: value.name.trim(),
      enabled: true,
      trigger: {
        type: value.triggerType.trim() || 'state',
        entityId: value.triggerEntityId.trim(),
      },
      conditions: [],
      actions: this.buildActions(value.entityId, value.action, value.value),
    };

    this.saving = true;
    this.error = null;
    this.api.createAutomation(automation)
      .pipe(finalize(() => this.finishSaving()))
      .subscribe({
        next: () => {
          this.automationForm.reset({
            name: '',
            entityId: '',
            action: 'turn_on',
            value: '',
            triggerEntityId: '',
            triggerType: 'state',
          });
          this.load();
        },
        error: () => this.error = 'Не удалось создать автоматизацию',
      });
  }

  toggleAutomation(automation: SmartHomeAutomation, event: Event): void {
    const enabled = (event.target as HTMLInputElement).checked;
    this.savingId = automation.id;
    this.error = null;
    this.api.updateAutomation({...automation, enabled})
      .pipe(finalize(() => this.finishSaving()))
      .subscribe({
        next: (updated) => {
          this.automations = this.automations.map((item) => item.id === updated.id ? updated : item);
        },
        error: () => this.error = 'Не удалось обновить автоматизацию',
      });
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return 'Нет данных';
    }

    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  private finishLoading(): void {
    this.loading = false;
    this.changeDetector.markForCheck();
  }

  private finishSaving(): void {
    this.saving = false;
    this.savingId = null;
    this.changeDetector.markForCheck();
  }

  private buildActions(entityId: string, action: string, rawValue: string): SmartHomeScenarioAction[] {
    const trimmedEntityId = entityId.trim();
    const trimmedAction = action.trim();

    if (!trimmedEntityId || !trimmedAction) {
      return [];
    }

    return [{
      entityId: trimmedEntityId,
      action: trimmedAction,
      value: this.parseValue(rawValue),
    }];
  }

  private parseValue(value: string): number | string | boolean | null {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    if (trimmed === 'true') {
      return true;
    }

    if (trimmed === 'false') {
      return false;
    }

    const numericValue = Number(trimmed);
    return Number.isFinite(numericValue) ? numericValue : trimmed;
  }

  private toFeature(feature: unknown): HomeFeature {
    return feature === 'scenarios' || feature === 'scenarioCreate' || feature === 'automations' || feature === 'events'
      ? feature
      : 'events';
  }

  private toEvent(payload: unknown): SmartHomeEvent | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const event = payload as Partial<SmartHomeEvent>;
    return typeof event.id === 'string' && typeof event.type === 'string' ? event as SmartHomeEvent : null;
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
