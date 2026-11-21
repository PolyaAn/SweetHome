import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { MainManuService } from "./services/main-manu.service";
import { MainWidget, MoveEnum } from "./models/main-menu.model";
import { BaseComponent } from "../base/base.component";
import { finalize, takeUntil } from "rxjs";
import { AsyncPipe, JsonPipe, NgClass, NgForOf, NgIf } from "@angular/common";
import { MatIcon } from "@angular/material/icon";
import { SharedService } from "../../shared/services/shared.service";
import { ToastService } from "../../shared/services/toast.service";
import { NewWidgetModalComponent } from "../../shared/components/modals/new-widget-modal/new-widget-modal.component";
import { MainInfoComponent } from "./components/main-info/main-info.component";
import { Router } from "@angular/router";

@Component({
  selector: 'app-main-menu',
  standalone: true,
  imports: [
    NgIf,
    NgForOf,
    NgClass,
    MatIcon,
    AsyncPipe,
    JsonPipe,
    MainInfoComponent
  ],
  templateUrl: './main-menu.component.html',
  styleUrl: './main-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainMenuComponent extends BaseComponent implements OnInit {
  constructor(
    public mms: MainManuService,
    private cdr: ChangeDetectorRef,
    private ss: SharedService,
    private router: Router,
    private toast: ToastService,
  ) {
    super();
  }

  editMode: boolean = false;
  savingWidgets: boolean = false;
  hiddenWidgets: boolean = false;
  isPhoneView: boolean = false;
  mobileTab: 'menu' | 'info' = 'menu';
  readonly MoveEnum = MoveEnum;

  ngOnInit(): void {
    this.updateViewportMode();
    this.getWidgets();
    this.editWatcher();
    this.mainWidgetsWatcher();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateViewportMode();
  }

  private updateViewportMode(): void {
    const isPhone: boolean = this.ss.isPhone;
    if (this.isPhoneView !== isPhone) {
      this.isPhoneView = isPhone;
      if (!isPhone) {
        this.mobileTab = 'menu';
      }
      this.cdr.detectChanges();
    }
  }

  private getWidgets(): void {
    this.mms.getWidgets()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: () => {
        },
        error: () => {
        },
      });
  }

  private mainWidgetsWatcher(): void {
    this.mms.mainWidgets$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (widgets: MainWidget[]) => {
          this.hiddenWidgets = !!widgets.filter((w: MainWidget) => w.hide).length;
          this.cdr.detectChanges();
        },
        error: () => {
        },
      });
  }

  private editWatcher(): void {
    this.mms.editMainPage$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (edit) => {
          this.editMode = edit;
          this.cdr.detectChanges();
        },
        error: () => {
        },
      });
  }

  move(position: MoveEnum, widget: MainWidget): void {
    if (this.savingWidgets) {
      return;
    }

    const widgets = this.mms.mainWidgets$.value;
    const visibleWidgets = widgets.filter(w => !w.hide).sort((a, b) => a.order - b.order);
    const index = visibleWidgets.findIndex(w => w.id === widget.id);
    const current = visibleWidgets[index];
    const target = visibleWidgets[index + (position === MoveEnum.LEFT ? -1 : 1)];
    if (!current || !target) {
      return;
    }

    this.mms.mainWidgets$.next(widgets.map(w => {
      if (w.id === current.id) {
        return { ...w, order: target.order };
      }
      if (w.id === target.id) {
        return { ...w, order: current.order };
      }
      return w;
    }));
  }

  hide(widget: MainWidget): void {
    if (this.savingWidgets) {
      return;
    }

    const mainWidgets = this.mms.mainWidgets$.value.map(w =>
      w.id === widget.id ? { ...w, hide: !w.hide } : w);

    this.mms.mainWidgets$.next(mainWidgets);
  }

  changeSize(widget: MainWidget): void {
    if (this.savingWidgets) {
      return;
    }

    const widgets = this.mms.mainWidgets$.value.map(w =>
      w.id === widget.id ? { ...w, size: w.size === 3 ? 1 : w.size + 1 } : w);
    this.mms.mainWidgets$.next(widgets);
  }

  openAddWidgetModal(): void {
    if (this.savingWidgets) {
      return;
    }

    this.ss.openDialog<NewWidgetModalComponent, {}>(NewWidgetModalComponent, {});
  }

  saveChanges(): void {
    if (this.savingWidgets) {
      return;
    }

    this.savingWidgets = true;
    this.mms.setWidgets()
      .pipe(
        takeUntil(this.unsubscribe$),
        finalize(() => {
          this.savingWidgets = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => this.mms.editMainPage(false),
        error: () => this.toast.error('Не удалось сохранить изменения виджетов. Попробуйте ещё раз.'),
      });
  }

  cancelChanges(): void {
    if (this.savingWidgets) {
      return;
    }

    this.mms.discardWidgetChanges();
    this.mms.editMainPage(false);
  }

  setMobileTab(tab: 'menu' | 'info'): void {
    this.mobileTab = tab;
  }

  openWidget(widget: MainWidget): void {
    if (this.editMode) {
      return;
    }

    if (widget.alias === 'coins') {
      this.router.navigate(['/coins']);
      return;
    }

    if (widget.alias === 'books') {
      this.router.navigate(['/books']);
      return;
    }

    if (widget.alias === 'health') {
      this.router.navigate(['/health-module']);
      return;
    }

    if (widget.alias === 'movies') {
      this.router.navigate(['/movies']);
      return;
    }

    if (widget.alias === 'home') {
      this.router.navigate(['/home']);
      return;
    }

    if (widget.alias === 'wardrobe') {
      this.router.navigate(['/wardrobe']);
      return;
    }

    if (widget.alias === 'finance') {
      this.router.navigate(['/finance']);
    }
  }
}
