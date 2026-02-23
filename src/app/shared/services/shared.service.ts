import { inject, Injectable } from '@angular/core';
import { MatDialog } from "@angular/material/dialog";
import { ComponentType } from "@angular/cdk/overlay";

@Injectable({
  providedIn: 'root'
})
export class SharedService {

  constructor() {
  }
  readonly dialog = inject(MatDialog);

  get isPhone(): boolean {
    return window.innerWidth < 768;
  }

  getValue<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
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
