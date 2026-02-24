import { Injectable } from '@angular/core';
import { MainWidget, UserInfo } from "../models/main-menu.model";
import { MainWidgetsMock, UserInfoMock } from "../mocks/main-menu.mock";
import { BehaviorSubject, Observable, of, tap } from "rxjs";
import { SharedService } from "../../../shared/services/shared.service";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class MainManuService {

  constructor(
    public ss: SharedService,
    private http: HttpClient,
  ) {
  }

  editMainPage$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  defaultMainWidgets$: BehaviorSubject<MainWidget[]> = new BehaviorSubject<MainWidget[]>([]);
  mainWidgets$: BehaviorSubject<MainWidget[]> = new BehaviorSubject<MainWidget[]>([]);

  getWidgets(): Observable<MainWidget[]> {
    return this.http.get<MainWidget[]>(`${environment.apiHost}/api/Widgets`, {
      withCredentials: true,
    }).pipe(
      tap((widgets: MainWidget[]) => {
        this.defaultMainWidgets$.next(this.ss.getValue(widgets));
        this.mainWidgets$.next(this.ss.getValue(widgets));
      })
    );
  }

  // getWidgets(): Observable<MainWidget[]> {
  //   return of(MainWidgetsMock).pipe(
  //     tap((widgets: MainWidget[]) => {
  //       this.defaultMainWidgets$.next(this.ss.getValue(widgets));
  //       this.mainWidgets$.next(this.ss.getValue(widgets));
  //     })
  //   );
  // }

  setWidgets(): Observable<MainWidget[]> {
    return of(this.mainWidgets$.value).pipe(
      tap((widgets: MainWidget[]) => {
        this.defaultMainWidgets$.next(this.ss.getValue(widgets));
        this.mainWidgets$.next(this.ss.getValue(widgets));
      })
    );
    // return of(widgets).pipe(
    //   map((widgets) => {
    //     this.defaultMainWidgets$.next(this.ss.getValue(widgets));
    //     this.mainWidgets$.next(this.ss.getValue(widgets));
    //   }));
  }

  getUserInfo(): Observable<UserInfo> {
    return of(UserInfoMock);
  }

  editMainPage(edit: boolean): void {
    this.editMainPage$.next(edit);
  }
}
