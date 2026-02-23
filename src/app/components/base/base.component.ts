import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  standalone: true,
  template: '',
})
export abstract class BaseComponent implements OnDestroy {
  public unsubscribe$ = new Subject<void>();
  public loading = false;

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}
