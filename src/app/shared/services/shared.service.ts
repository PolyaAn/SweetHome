import { inject, Injectable } from '@angular/core';
import { MatDialog } from "@angular/material/dialog";
import { ComponentType } from "@angular/cdk/overlay";
import { BehaviorSubject } from "rxjs";

export type MovieViewMode = 'list' | 'grid';

@Injectable({
  providedIn: 'root'
})
export class SharedService {

  constructor() {
  }
  readonly dialog = inject(MatDialog);
  readonly movieViewMode$: BehaviorSubject<MovieViewMode> = new BehaviorSubject<MovieViewMode>('list');
  readonly homeRoomTitle$: BehaviorSubject<string> = new BehaviorSubject<string>('');

  get isPhone(): boolean {
    return window.innerWidth < 768;
  }

  getValue<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  setMovieViewMode(mode: MovieViewMode): void {
    this.movieViewMode$.next(mode);
  }

  setHomeRoomTitle(title: string): void {
    this.homeRoomTitle$.next(title);
  }

  openDialog<T, D = any>(component: ComponentType<T>, config: D): void {
    this.dialog.open(component, {
      data: config,
      panelClass: 'modern-form-dialog',
      autoFocus: false,
      restoreFocus: false,
    });
  }
}
