import { Injectable } from '@angular/core';
import { Health } from '../models/health.model';
import { HealthMock } from '../mocks/health.mock';
import { BehaviorSubject, Observable, of, tap } from "rxjs";
import { SharedService } from "../../../shared/services/shared.service";

@Injectable()
export class HealthModuleService {

  constructor(
    public ss: SharedService,
  ) {
  }

  private healthStore: Health = this.ss.getValue(HealthMock);
  healthInfo$: BehaviorSubject<Health> = new BehaviorSubject<Health>(this.ss.getValue(this.healthStore));

  getHealthInfo(date: string): Observable<Health> {
    return of(this.ss.getValue(this.healthStore)).pipe(
      tap((healthInfo: Health) => {
        this.healthInfo$.next(this.ss.getValue(healthInfo));
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
