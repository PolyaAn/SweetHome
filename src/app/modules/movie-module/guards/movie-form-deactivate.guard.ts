import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';

export interface PendingChangesComponent {
  canDeactivate: () => boolean;
}

@Injectable()
export class MovieFormDeactivateGuard implements CanDeactivate<PendingChangesComponent> {
  canDeactivate(component: PendingChangesComponent): boolean {
    return component.canDeactivate();
  }
}
