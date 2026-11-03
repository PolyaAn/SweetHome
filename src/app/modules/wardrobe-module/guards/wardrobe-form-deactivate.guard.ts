import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';

export interface WardrobePendingChanges {
  canDeactivate: () => boolean;
}

@Injectable()
export class WardrobeFormDeactivateGuard implements CanDeactivate<WardrobePendingChanges> {
  canDeactivate(component: WardrobePendingChanges): boolean {
    return component.canDeactivate();
  }
}
