import { Injectable } from '@angular/core';
import { Health, HealthApi, HealthSection } from '../models/health.model';
import { HealthMock, HealthSectionsMock } from '../mocks/health.mock';
import { BehaviorSubject, map, Observable, tap } from "rxjs";
import { SharedService } from "../../../shared/services/shared.service";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../../environments/environment";

@Injectable()
export class HealthModuleService {

  constructor(
    public ss: SharedService,
    private http: HttpClient,
  ) {
  }

  private healthStore: Health = this.ss.getValue(HealthMock);
  healthInfo$: BehaviorSubject<Health> = new BehaviorSubject<Health>(this.ss.getValue(this.healthStore));
  private healthSections: HealthSection[] = this.ss.getValue(HealthSectionsMock);
  healthSections$: BehaviorSubject<HealthSection[]> = new BehaviorSubject<HealthSection[]>(this.ss.getValue(this.healthSections));

  getHealthInfo(date: string): Observable<HealthApi> {
    return this.http.get<HealthApi>(`${environment.apiHost}/api/Health`, {
      withCredentials: true,
      params: {
        date,
      },
    }).pipe(
      tap((healthInfo: HealthApi) => {
        this.healthInfo$.next(this.ss.getValue(healthInfo.health));
        this.healthSections$.next(this.ss.getValue(healthInfo.healthSections));
      })
    );
  }

  setHealthInfo(health: Health): Observable<HealthApi> {
    console.log(health);
    return this.http.put<HealthApi | Health>(`${environment.apiHost}/api/Health`, health, {
      withCredentials: true,
    }).pipe(
      map((response: HealthApi | Health) => this.normalizeHealthResponse(response, health)),
      tap((response: HealthApi) => {
        this.healthStore = this.ss.getValue(response.health);
        this.healthInfo$.next(this.ss.getValue(this.healthStore));
        this.healthSections$.next(this.ss.getValue(response.healthSections));
      })
    );
  }

  //TODO: переписать эту фигню
  private normalizeHealthResponse(response: HealthApi | Health, fallbackHealth: Health): HealthApi {
    if (this.isHealthApi(response)) {
      return response;
    }

    return {
      health: this.ss.getValue(response || fallbackHealth),
      healthSections: this.ss.getValue(this.healthSections$.value),
    };
  }

  private isHealthApi(value: HealthApi | Health): value is HealthApi {
    const candidate: HealthApi = value as HealthApi;
    return !!candidate && !!candidate.health && Array.isArray(candidate.healthSections);
  }
}
