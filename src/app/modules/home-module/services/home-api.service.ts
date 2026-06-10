import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../shared/services/api.service';
import {
  HomeAssistantActionRequest,
  HomeAssistantCatalogWidget,
  SmartHomeLayout,
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
}
