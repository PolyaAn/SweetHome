import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../shared/services/api.service';
import {
  HomeAssistantActionRequest,
  HomeAssistantCatalogWidget,
  SmartHomeAutomation,
  SmartHomeEvent,
  SmartHomeLayout,
  SmartHomeScenario,
} from '../models/home.model';

@Injectable()
export class HomeApiService {
  constructor(private api: ApiService) {
  }

  getCatalog(): Observable<HomeAssistantCatalogWidget[]> {
    return this.api.get<HomeAssistantCatalogWidget[]>('/api/SmartHome/widget-catalog');
  }

  getLayout(): Observable<SmartHomeLayout> {
    return this.api.get<SmartHomeLayout>('/api/SmartHome/layout');
  }

  saveLayout(layout: SmartHomeLayout): Observable<void> {
    return this.api.put<void, SmartHomeLayout>('/api/SmartHome/layout', layout);
  }

  executeAction(action: HomeAssistantActionRequest): Observable<void> {
    return this.api.push<void, HomeAssistantActionRequest>('/api/SmartHome/actions', action);
  }

  getScenarios(): Observable<SmartHomeScenario[]> {
    return this.api.get<SmartHomeScenario[]>('/api/SmartHome/scenarios');
  }

  createScenario(scenario: SmartHomeScenario): Observable<SmartHomeScenario> {
    return this.api.push<SmartHomeScenario, SmartHomeScenario>('/api/SmartHome/scenarios', scenario);
  }

  executeScenario(scenarioId: string): Observable<void> {
    return this.api.push<void, Record<string, never>>(`/api/SmartHome/scenarios/${scenarioId}/execute`, {});
  }

  getAutomations(): Observable<SmartHomeAutomation[]> {
    return this.api.get<SmartHomeAutomation[]>('/api/SmartHome/automations');
  }

  createAutomation(automation: SmartHomeAutomation): Observable<SmartHomeAutomation> {
    return this.api.push<SmartHomeAutomation, SmartHomeAutomation>('/api/SmartHome/automations', automation);
  }

  updateAutomation(automation: SmartHomeAutomation): Observable<SmartHomeAutomation> {
    return this.api.put<SmartHomeAutomation, SmartHomeAutomation>(`/api/SmartHome/automations/${automation.id}`, automation);
  }

  getEvents(take = 100): Observable<SmartHomeEvent[]> {
    return this.api.get<SmartHomeEvent[]>('/api/SmartHome/events', {params: {take}});
  }
}
