import { Injectable } from '@angular/core';
import { Health, HealthApi, HealthSection } from '../models/health.model';
import { DefaultHealthDictionary, HealthMock, HealthSectionsMock } from '../mocks/health.mock';
import { BehaviorSubject, Observable, of, tap } from "rxjs";
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

  setHealthInfo(health: Health): Observable<Health> {
    return of(this.ss.getValue(health)).pipe(
      tap((updatedHealth: Health) => {
        this.healthStore = this.ss.getValue(updatedHealth);
        this.healthInfo$.next(this.ss.getValue(this.healthStore));
      })
    );
  }
}
