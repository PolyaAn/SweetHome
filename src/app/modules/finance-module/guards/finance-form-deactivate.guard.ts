import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';

export interface FinancePendingChanges {
  canDeactivate: () => boolean;
}

@Injectable()
export class FinanceFormDeactivateGuard implements CanDeactivate<FinancePendingChanges> {
  canDeactivate(component: FinancePendingChanges): boolean {
    return component.canDeactivate();
  }
}
